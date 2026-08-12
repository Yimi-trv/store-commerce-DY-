SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCUSTOMERSVIEWV2_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCUSTOMERSVIEWV2_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCUSTOMERSVIEWV2_PEVIEW]
AS
SELECT        ct.ACCOUNTNUM AS ACCOUNTNUMBER, ct.RECID, ct.CREATEDDATETIME, dpt.RECID AS PARTY, dpt.NAME, dpn.RECID AS PERSONNAMEID, dpn.FIRSTNAME, dpn.MIDDLENAME, dpn.LASTNAME, dpt.PARTYNUMBER, 
                         CASE WHEN dpn.RECID IS NULL THEN 2 /* Organization*/ ELSE 1 /* Customer*/ END AS CUSTOMERTYPE, cpeu.PHONE, cpeu.PHONEEXT, cpeu.PHONERECID AS PHONERECORDID, cpeu.EMAIL, 
                         cpeu.EMAILRECID AS EMAILRECORDID, cpeu.URL, cpeu.URLRECID AS URLRECORDID, cpeu.CELLPHONE, cpeu.CELLRECID AS CELLPHONERECORDID, rct.RECEIPTEMAIL AS RECEIPTEMAIL, dpt.LANGUAGEID AS LANGUAGE, 
                         ct.DATAAREAID, rct.RECEIPTOPTION AS RECEIPTSETTINGS, ct.CURRENCY, ct.INVOICEACCOUNT, ct.CREDITMAX, ct.MARKUPGROUP, ct.PRICEGROUP, ct.CUSTGROUP, ct.BLOCKED, ct.ORGID, ct.MULTILINEDISC, 
                         ct.USEPURCHREQUEST, ct.LINEDISC, ct.INCLTAX, ct.ENDDISC, ct.TAXGROUP, ct.CREDITRATING, ct.TAXLICENSENUM, ct.VATNUM, 
                         CAST(N'' AS XML ).value('xs:base64Binary(xs:hexBinary(sql:column("[rmr].[RESOURCEBLOB]")))', 'NVARCHAR(MAX)') AS OFFLINEIMAGE, ct.IDENTIFICATIONNUMBER, rmr.RESOURCEURL AS IMAGE, 0 AS ISASYNCCUSTOMER, 
                         ISNULL(rct.OPTOUTPERSONALIZATION, 0) AS OPTOUTPERSONALIZATION, ISNULL(rct.OPTOUTWEBACTIVITYTRACKING, 0) AS OPTOUTWEBACTIVITYTRACKING, ISNULL(dp.PERSONALTITLE, 0) AS TITLERECORDID, 
                         ISNULL(mct.ALLOWONACCOUNT, 0) AS ALLOWONACCOUNT
FROM            [ax].CUSTTABLE ct JOIN
                         [ax].DIRPARTYTABLE dpt ON ct.PARTY = dpt.RECID LEFT OUTER JOIN
                         ax.RETAILCUSTTABLE rct ON ct.ACCOUNTNUM = rct.ACCOUNTNUM AND ct.DATAAREAID = rct.DATAAREAID LEFT OUTER JOIN
                         ax.DIRPERSONNAME dpn ON dpt.RECID = dpn.PERSON AND (GETUTCDATE() BETWEEN dpn.VALIDFROM AND dpn.VALIDTO) /* phone/email/url/cellphone*/ OUTER APPLY[crt].[GETCUSTOMERPHONEEMAILURLCELLPHONE](0, 
                         dpt.RECID) cpeu LEFT OUTER JOIN
                         [ax].RETAILMEDIAANDMASTERENTITYRELATION rmamer ON ct.RECID = rmamer.MASTERENTITYRECID AND rmamer.ISDEFAULT = 1 AND rmamer.MASTERENTITYTYPE = 16 /* MasterEntityType = Customer.*/ LEFT OUTER JOIN
                         [ax].RETAILMEDIARESOURCE rmr ON rmamer.MEDIARESOURCEID = rmr.RESOURCEID LEFT OUTER JOIN
                         [ax].DIRPERSON dp ON dp.RECID = dpt.RECID LEFT OUTER JOIN
                         [ax].MCRCUSTTABLE mct ON ct.DATAAREAID = mct.DATAAREAID AND ct.RECID = mct.CUSTTABLE
UNION ALL
SELECT        rac.CUSTACCOUNTASYNC AS ACCOUNTNUMBER, 0 AS RECID, 0 AS CREATEDDATETIME, 0 AS PARTY, rac.CUSTNAME AS NAME, 0 AS PERSONNAMEID, rac.FIRSTNAME, rac.MIDDLENAME, rac.LASTNAME, '' AS PARTYNUMBER,
                          rac.RELATIONSHIPTYPE AS CUSTOMERTYPE, rac.PHONE, rac.PHONEEXTENSION AS PHONEEXT, '' AS PHONERECORDID, rac.EMAIL, NULL AS EMAILRECORDID, rac.URL, '' AS URLRECORDID, 
                         rac.CELLULARPHONE AS CELLPHONE, '' AS CELLPHONERECORDID, rac.RECEIPTEMAIL AS RECEIPTEMAIL, rac.LANGUAGEID AS LANGUAGE, rac.DATAAREAID, rac.RECEIPTOPTION AS RECEIPTSETTINGS, rac.CURRENCY, 
                         rac.INVOICEACCOUNT, rac.CREDITMAX, '' AS MARKUPGROUP, rac.PRICEGROUP, rac.CUSTGROUP, rac.BLOCKED, rac.ORGANIZATIONID AS ORGID, rac.MULTILINEDISC AS MULTILINEDISC, rac.USEPURCHREQUEST, 
                         rac.LINEDISC, 0 AS INCLTAX, rac.ENDDISC, rac.TAXGROUP, '' AS CREDITRATING, '' AS TAXLICENSENUM, rac.VATNUM, NULL AS OFFLINEIMAGE, rac.IDENTIFICATIONNUMBER, NULL AS IMAGE, 1 AS ISASYNCCUSTOMER, 
                         0 AS OPTOUTPERSONALIZATION, 0 AS OPTOUTWEBACTIVITYTRACKING, rac.TITLERECORDID, 0 AS ALLOWONACCOUNT
FROM            [ax].RETAILASYNCCUSTOMER rac
UNION ALL
SELECT * FROM 
(
SELECT        rac.CUSTACCOUNTASYNC AS ACCOUNTNUMBER, 0 AS RECID, 0 AS CREATEDDATETIME, 0 AS PARTY, rac.CUSTNAME AS NAME, 0 AS PERSONNAMEID, rac.FIRSTNAME, rac.MIDDLENAME, rac.LASTNAME, '' AS PARTYNUMBER,
                          rac.RELATIONSHIPTYPE AS CUSTOMERTYPE, rac.PHONE, rac.PHONEEXTENSION AS PHONEEXT, '' AS PHONERECORDID, rac.EMAIL, NULL AS EMAILRECORDID, rac.URL, '' AS URLRECORDID, 
                         rac.CELLULARPHONE AS CELLPHONE, '' AS CELLPHONERECORDID, rac.RECEIPTEMAIL AS RECEIPTEMAIL, rac.LANGUAGEID AS LANGUAGE, rac.DATAAREAID, rac.RECEIPTOPTION AS RECEIPTSETTINGS, rac.CURRENCY, 
                         rac.INVOICEACCOUNT, rac.CREDITMAX, '' AS MARKUPGROUP, rac.PRICEGROUP, rac.CUSTGROUP, rac.BLOCKED, rac.ORGANIZATIONID AS ORGID, rac.MULTILINEDISC AS MULTILINEDISC, rac.USEPURCHREQUEST, 
                         rac.LINEDISC, 0 AS INCLTAX, rac.ENDDISC, rac.TAXGROUP, '' AS CREDITRATING, '' AS TAXLICENSENUM, rac.VATNUM, NULL AS OFFLINEIMAGE, rac.IDENTIFICATIONNUMBER, NULL AS IMAGE, 1 AS ISASYNCCUSTOMER, 
                         0 AS OPTOUTPERSONALIZATION, 0 AS OPTOUTWEBACTIVITYTRACKING, rac.TITLERECORDID, rac.REPLICATIONCOUNTERFROMORIGIN AS ALLOWONACCOUNT
FROM            [ax].RETAILASYNCCUSTOMERV2 rac
) result 
WHERE ALLOWONACCOUNT =
				-- even though custaccountasync cannot be modified, we still need to be sure that it not deactivated
			(   -- we are only interested in the latest state for each cust account
				SELECT MAX([racv2].REPLICATIONCOUNTERFROMORIGIN) PARTYID
				FROM [ax].RETAILASYNCCUSTOMERV2 racv2
				WHERE [racv2].CUSTACCOUNTASYNC = result.ACCOUNTNUMBER
			)

GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPDireccionReceptorAsync_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPDireccionReceptorAsync_PEVIEW];
END
GO
CREATE VIEW [ext].[DPDireccionReceptorAsync_PEVIEW]
AS
			SELECT 	raa.CUSTACCOUNTASYNC,
			RTRIM(LTRIM(raa.Street)) +' '+ RTRIM(LTRIM(raa.StreetNumber)) +' '+  
			RTRIM(LTRIM(raa.BuildingCompliment)) +' '+ 
			UPPER(LTRIM(RTrim(logisticsAddressCity.Description))) +'-'+  
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCounty.Name,'')))) +'-'+
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressState.Name,'')))) DIRECCION
			, 0 AS replicaID
			FROM [ax].RETAILASYNCADDRESS raa
			LEFT JOIN ax.LogisticsAddressState 
				ON logisticsAddressState.COUNTRYREGIONID = raa.COUNTRY AND logisticsAddressState.STATEID = raa.STATE
			LEFT JOIN ax.logisticsAddressCounty
				ON logisticsAddressCounty.COUNTRYREGIONID = raa.COUNTRY AND logisticsAddressCounty.STATEID = raa.STATE
					AND logisticsAddressCounty.COUNTYID = raa.COUNTY
			LEFT JOIN ax.LogisticsAddressCity
				ON LogisticsAddressCity.COUNTRYREGIONID = raa.COUNTRY AND LogisticsAddressCity.STATEID = raa.STATE
					AND LogisticsAddressCity.COUNTYID = raa.COUNTY AND LogisticsAddressCity.NAME = raa.CITY
			ORDER BY raa.CUSTACCOUNTASYNC, raa.MAKEPOSTALADDRESSPRIMARY desc	 OFFSET 0 ROWS
			UNION ALL

			SELECT * FROM
			(
			SELECT raa.CUSTACCOUNTASYNC,			
			RTRIM(LTRIM(raa.Street)) +' '+ RTRIM(LTRIM(raa.StreetNumber)) +' '+  
			RTRIM(LTRIM(raa.BuildingCompliment)) +' '+ 
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCity.Description,'')))) +'-'+  
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCounty.Name,'')))) +'-'+
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressState.Name,'')))) DIRECCION
			, raa.REPLICATIONCOUNTERFROMORIGIN replicaID
			FROM [ax].RETAILASYNCADDRESSV2 raa
			INNER JOIN AX.RETAILASYNCCUSTOMERV2 racv ON raa.CUSTACCOUNTASYNC = racv.CUSTACCOUNTASYNC
			LEFT JOIN ax.LogisticsAddressState 
				ON logisticsAddressState.COUNTRYREGIONID = raa.COUNTRY AND logisticsAddressState.STATEID = raa.STATE
			LEFT JOIN ax.logisticsAddressCounty
				ON logisticsAddressCounty.COUNTRYREGIONID = raa.COUNTRY AND logisticsAddressCounty.STATEID = raa.STATE
					AND logisticsAddressCounty.COUNTYID = raa.COUNTY
			LEFT JOIN ax.LogisticsAddressCity
				ON LogisticsAddressCity.COUNTRYREGIONID = raa.COUNTRY AND LogisticsAddressCity.STATEID = raa.STATE
					AND LogisticsAddressCity.COUNTYID = raa.COUNTY AND LogisticsAddressCity.NAME = raa.CITY
			--WHERE raa.MAKEPOSTALADDRESSPRIMARY = 1
			) result 
			WHERE replicaID =
				-- even though custaccountasync cannot be modified, we still need to be sure that it not deactivated
			(   -- we are only interested in the latest state for each cust account
				SELECT TOP 1 MAX([racv2].REPLICATIONCOUNTERFROMORIGIN) PARTYID
				FROM [ax].RETAILASYNCADDRESSV2 racv2
				WHERE [racv2].CUSTACCOUNTASYNC = result.CUSTACCOUNTASYNC
				AND racv2.OPERATION <> 3 -- 3 = deactivated
				  GROUP BY COALESCE(racv2.[CUSTACCOUNT], racv2.[CUSTACCOUNTASYNC]), ADDRESSID
			)
			--ORDER BY raa.CUSTACCOUNTASYNC, raa.MAKEPOSTALADDRESSPRIMARY desc	 OFFSET 0 ROWS
GO


--****** Object:  View [ext].[DPDireccionReceptor_PEVIEW]    Script Date: 5/21/2019 9:40:08 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPDireccionReceptor_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPDireccionReceptor_PEVIEW];
END
GO
CREATE VIEW [ext].[DPDireccionReceptor_PEVIEW]
AS
		SELECT partyLocation.Party, 
			RTRIM(LTRIM(postalAddress.Street)) +' '+ RTRIM(LTRIM(postalAddress.StreetNumber)) +' '+ 
			RTRIM(LTRIM(postalAddress.BuildingCompliment)) +' '+ 
			UPPER(LTRIM(RTrim(ISNULL(ISNULL(logisticsAddressCity.Description,''),
				(Select DESCRIPTION from ax.LogisticsAddressCity	
				where COUNTRYREGIONID = postalAddress.CountryRegionId
				AND COUNTYID = postalAddress.County
				AND STATEID = postalAddress.State
				AND NAME = postalAddress.City)
				)))) +'-'+  
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCounty.Name,'')))) +'-'+
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressState.Name,'')))) DIRECCION
		FROM  ax.DIRPARTYLOCATION partyLocation       
		INNER JOIN
      ax.LogisticsPostalAddress postalAddress ON partyLocation.Location = postalAddress.Location 
	  AND partyLocation.IsPrimary = 1 
  AND (GETUTCDATE() BETWEEN postalAddress.VALIDFROM AND postalAddress.VALIDTO)
       LEFT outer join ax.LogisticsAddressCity logisticsAddressCity
            ON postalAddress.CityRecId = logisticsAddressCity.RecId
			AND postalAddress.state = logisticsAddressCity.stateId 
             AND postalAddress.county = logisticsAddressCity.CountyId 
             AND postalAddress.CountryRegionId = logisticsAddressCity.CountryRegionId
       LEFT outer join ax.LogisticsAddressState logisticsAddressState
            ON postalAddress.state = logisticsAddressState.stateId 
            AND postalAddress.CountryRegionId = logisticsAddressState.CountryRegionId
       LEFT outer join ax.logisticsAddressCounty
            ON postalAddress.state = logisticsAddressCounty.stateId 
             AND postalAddress.county = logisticsAddressCounty.CountyId 
             AND postalAddress.CountryRegionId = logisticsAddressCounty.CountryRegionId
		ORDER BY postalAddress.VALIDTO DESC	 OFFSET 0 ROWS
GO


IF OBJECT_ID(N'[ext].[DPUPDATECUSTOMERASINCRONEV2_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPUPDATECUSTOMERASINCRONEV2_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPUPDATECUSTOMERASINCRONEV2_PE].';
END
GO
ALTER PROCEDURE [ext].[DPUPDATECUSTOMERASINCRONEV2_PE]
    @nvc_DataAreaId                         NVARCHAR(4),
	@Channel								BIGINT,
	@Store									NVARCHAR(10),
	@OPCION									NVARCHAR(5) = 'UPD01'

AS
BEGIN

    SET NOCOUNT ON;

    DECLARE @i_ReturnCode                           INT;
    DECLARE @i_TransactionIsOurs                    INT;
    DECLARE @i_Error                                INT;
    DECLARE @dtt_ChangeDateTime                     DATETIME;
    DECLARE @dtt_MaxAxDateTime                      DATETIME;


	 -- initializes the return code and assume the transaction is not ours by default
    SET @i_ReturnCode = 0;
    SET @i_TransactionIsOurs = 0;

    IF @@TRANCOUNT = 0
    BEGIN
        BEGIN TRANSACTION;

        SELECT @i_Error = @@ERROR;
        IF @i_Error <> 0
        BEGIN
            SET @i_ReturnCode = @i_Error;
            GOTO exit_label;
        END;

        SET @i_TransactionIsOurs = 1;
    END;

    SET @dtt_ChangeDateTime = GETUTCDATE();
    SET @dtt_MaxAxDateTime = crt.GETMAXAXDATETIME(); -- Never expires	
		IF @OPCION = 'UPD01'
			BEGIN

			UPDATE	T1 
			SET			 
				T1.OPERATION = 3 --1 ACTIVO			
			FROM
				AX.RETAILASYNCCUSTOMERV2 AS T1
				INNER JOIN AX.RETAILCUSTTABLE AS T2
					ON T1.CustAccountAsync = T2.CUSTACCOUNTASYNC
					AND T1.DATAAREAID = T2.DATAAREAID
					AND (T1.OPERATION = 1 OR T1.OPERATION = 2)
					AND T1.CUSTACCOUNTASYNC != ''
			WHERE
				T1.DATAAREAID = @nvc_DataAreaId
				AND T1.ORIGINATINGCHANNEL = @Channel				

		END
	
				


SELECT @i_Error = @@ERROR;
    IF @i_Error <> 0
    BEGIN
        SET @i_ReturnCode = @i_Error;
        GOTO exit_label;
    END;


    IF @i_TransactionIsOurs = 1
    BEGIN
        COMMIT TRANSACTION;	
        SET @i_Error = @@ERROR;
        IF @i_Error <> 0
        BEGIN
            SET @i_ReturnCode = @i_Error;
			SELECT @i_ReturnCode
            GOTO exit_label;
        END;

        SET @i_TransactionIsOurs = 0;
    END;

exit_label:

    IF @i_TransactionIsOurs = 1
    BEGIN
        ROLLBACK TRANSACTION;
    END;

    RETURN @i_ReturnCode;
END

GO