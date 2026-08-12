SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- DEFINICION DE TABLE TYPE
-- Object:  UserDefinedTableType [ext].[DPSTRINGIDTABLETYPE_PE]    Script Date: 5/21/2019 9:43:55 PM 
IF TYPE_ID('[ext].[DPSTRINGIDTABLETYPE_PE]') IS NOT NULL
BEGIN
	DROP PROCEDURE [ext].[GETCUSTOMERASYNCPOSTALADDRESSES_PE]
	DROP TYPE [ext].[DPSTRINGIDTABLETYPE_PE]
END
GO
BEGIN
CREATE TYPE [ext].[DPSTRINGIDTABLETYPE_PE] AS TABLE(
	[STRINGID] [nvarchar](100) NOT NULL,
	PRIMARY KEY CLUSTERED 
( [STRINGID] ASC
))
END
GO

GRANT EXEC ON TYPE::[ext].[DPSTRINGIDTABLETYPE_PE] TO [UsersRole]
GO
GRANT EXEC ON TYPE::[ext].[DPSTRINGIDTABLETYPE_PE] TO [DeployExtensibilityRole];
GO
GRANT EXEC ON TYPE::[ext].[DPSTRINGIDTABLETYPE_PE] TO [DataSyncUsersRole]
GO


-- Retrieves the async addresses associated for both sync and async customers. To retrieve the list of sync addresses, consider using GETCUSTOMERPOSTALADDRESSES instead.
IF OBJECT_ID(N'[ext].[GETCUSTOMERASYNCPOSTALADDRESSES_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[GETCUSTOMERASYNCPOSTALADDRESSES_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[GETCUSTOMERASYNCPOSTALADDRESSES_PE]';
END
GO

ALTER PROCEDURE [EXT].[GETCUSTOMERASYNCPOSTALADDRESSES_PE]
    @nvc_DataAreaId            NVARCHAR(4),
    @tvp_CustomerAccountIds    [EXT].[DPSTRINGIDTABLETYPE_PE] READONLY
AS
BEGIN
	SELECT 	
		RTRIM(LTRIM(raa.Street)) +' '+ RTRIM(LTRIM(raa.StreetNumber)) +' '+  
		RTRIM(LTRIM(raa.BuildingCompliment)) +' '+ 
		UPPER(LTRIM(RTrim(logisticsAddressCity.Description))) +'-'+  
		UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCounty.Name,'')))) +'-'+
		UPPER(LTRIM(RTrim(ISNULL(logisticsAddressState.Name,'')))) DIRECCION,
		raa.MAKEPOSTALADDRESSPRIMARY  as  ISPRIMARY,
		raa.REPLICATIONCOUNTERFROMORIGIN as RECORDID
		FROM [ax].RETAILASYNCADDRESS raa
		LEFT JOIN ax.LogisticsAddressState 
			ON logisticsAddressState.COUNTRYREGIONID = raa.COUNTRY AND logisticsAddressState.STATEID = raa.STATE
		LEFT JOIN ax.logisticsAddressCounty
			ON logisticsAddressCounty.COUNTRYREGIONID = raa.COUNTRY AND logisticsAddressCounty.STATEID = raa.STATE
				AND logisticsAddressCounty.COUNTYID = raa.COUNTY
		LEFT JOIN ax.LogisticsAddressCity
			ON LogisticsAddressCity.COUNTRYREGIONID = raa.COUNTRY AND LogisticsAddressCity.STATEID = raa.STATE
				AND LogisticsAddressCity.COUNTYID = raa.COUNTY AND LogisticsAddressCity.NAME = raa.CITY
	WHERE raa.[DATAAREAID] = @nvc_DataAreaId
    AND raa.[CUSTACCOUNTASYNC] IN (SELECT STRINGID FROM @tvp_CustomerAccountIds)

	UNION ALL

	SELECT 			
			RTRIM(LTRIM(raa.Street)) +' '+ RTRIM(LTRIM(raa.StreetNumber)) +' '+  
			RTRIM(LTRIM(raa.BuildingCompliment)) +' '+ 
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCity.Description,'')))) +'-'+  
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCounty.Name,'')))) +'-'+
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressState.Name,'')))) DIRECCION,
			raa.[MAKEPOSTALADDRESSPRIMARY] as  ISPRIMARY,
			raa.REPLICATIONCOUNTERFROMORIGIN as RECORDID
			FROM [ax].RETAILASYNCADDRESSV2 raa		
			LEFT JOIN ax.LogisticsAddressState 
				ON logisticsAddressState.COUNTRYREGIONID = raa.COUNTRY AND logisticsAddressState.STATEID = raa.STATE
			LEFT JOIN ax.logisticsAddressCounty
				ON logisticsAddressCounty.COUNTRYREGIONID = raa.COUNTRY AND logisticsAddressCounty.STATEID = raa.STATE
					AND logisticsAddressCounty.COUNTYID = raa.COUNTY
			LEFT JOIN ax.LogisticsAddressCity
				ON LogisticsAddressCity.COUNTRYREGIONID = raa.COUNTRY AND LogisticsAddressCity.STATEID = raa.STATE
					AND LogisticsAddressCity.COUNTYID = raa.COUNTY AND LogisticsAddressCity.NAME = raa.CITY
		WHERE raa.[DATAAREAID] = @nvc_DataAreaId
        AND (raa.[CUSTACCOUNTASYNC] IN (SELECT STRINGID FROM @tvp_CustomerAccountIds)
            OR raa.[CUSTACCOUNT] IN (SELECT STRINGID FROM @tvp_CustomerAccountIds))
		--ORDER BY raa.MAKEPOSTALADDRESSPRIMARY DESC

END
GO

GRANT EXECUTE ON [ext].[GETCUSTOMERASYNCPOSTALADDRESSES_PE] TO [UsersRole];
GO

GRANT EXECUTE ON [ext].[GETCUSTOMERASYNCPOSTALADDRESSES_PE] TO [DeployExtensibilityRole];
GO

IF OBJECT_ID(N'[ext].[DPGETCUSTOMERPARTYID_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPGETCUSTOMERPARTYID_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPGETCUSTOMERPARTYID_PE]';
END
GO

ALTER PROCEDURE [ext].[DPGETCUSTOMERPARTYID_PE]
    @partyId			 BIGINT,
    @nvc_DataAreaId       NVARCHAR(4) -- The unique channel identifier (required).
AS
BEGIN

/*  // data level map for hardware station:
    //
    // data level           |   content
    // =====================|================================================================
    // Customer	POS         |   Clientes Creados en el POS
    // Customer	HQ          |   Clientes retornados del HQ
    // =====================|================================================================
*/

    SET NOCOUNT ON
    DECLARE @i_ReturnCode               INT;

    -- initializes the return code; we'll return the number of data sets as the return code.
    SET @i_ReturnCode = 0;

	 -- Get los datos de los clientes en la tabla inicial que son creados y modificados en el POS
	 SELECT dpCt.ACCOUNTNUM, dpCt.DPNUMBERDOCUMID_PE, dpCt.DPTYPEDOCID_PE  FROM  [ax].DIRPARTYTABLE dpt         
		LEFT OUTER JOIN [ax].CUSTTABLE ct ON [ct].PARTY = [dpt].RECID AND [ct].DATAAREAID = @nvc_DataAreaId
		LEFT OUTER JOIN ext.DPCUSTTABLE_PE dpCt ON ct.ACCOUNTNUM  = dpCt.ACCOUNTNUM AND [ct].DATAAREAID = dpCt.DATAAREAID
		WHERE  [dpt].RECID = @partyId;

	SET @i_ReturnCode = @i_ReturnCode + 1;
		
	 -- Get los datos de los clientes en la tabla que son obtenidos del HQ
		SELECT dpCt.ACCOUNTNUM, dpCt.DPNUMBERDOCUMID_PE, dpCt.DPTYPEDOCID_PE 
		FROM  [ax].DIRPARTYTABLE dpt         
        LEFT OUTER JOIN [ax].CUSTTABLE ct ON [ct].PARTY = [dpt].RECID AND [ct].DATAAREAID = @nvc_DataAreaId
		LEFT OUTER JOIN ext.CUSTTABLE dpCt ON ct.ACCOUNTNUM  = dpCt.ACCOUNTNUM AND [ct].DATAAREAID = dpCt.DATAAREAID
		WHERE  [dpt].RECID = @partyId;
	SET @i_ReturnCode = @i_ReturnCode + 1;

	-- Get los datos de los clientes creados de manera asyncrona
	SELECT dpCt.ACCOUNTNUM, dpCt.DPNUMBERDOCUMID_PE, dpCt.DPTYPEDOCID_PE  
	FROM [ax].RETAILASYNCCUSTOMER rac
	INNER JOIN  ext.DPCUSTTABLE_PE dpCt  ON rac.CUSTACCOUNTASYNC = dpCT.CustAccountAsync
		AND rac.DATAAREAID = dpCT.DATAAREAID
		WHERE  rac.REPLICATIONCOUNTERFROMORIGIN= @partyId AND rac.DATAAREAID = @nvc_DataAreaId;

	SET @i_ReturnCode = @i_ReturnCode + 1;

	-- Get los datos de los clientes en la tabla que son obtenidos del HQ Pero aún no ha sido actualizado sus datos
	SELECT dpCt.ACCOUNTNUM, dpCt.DPNUMBERDOCUMID_PE, dpCt.DPTYPEDOCID_PE 
	FROM  [ax].DIRPARTYTABLE dpt         
    LEFT OUTER JOIN [ax].CUSTTABLE ct ON [ct].PARTY = [dpt].RECID AND [ct].DATAAREAID = @nvc_DataAreaId
	LEFT OUTER JOIN [ax].RETAILCUSTTABLE rct ON  rct.ACCOUNTNUM = ct.ACCOUNTNUM
	LEFT OUTER JOIN ext.DPCUSTTABLE_PE dpCt ON  rct.CUSTACCOUNTASYNC = dpCt.ACCOUNTNUM  AND dpCt.DATAAREAID = ct.DATAAREAID
		WHERE  [dpt].RECID = @partyId AND dpCt.DATAAREAID = @nvc_DataAreaId;
	SET @i_ReturnCode = @i_ReturnCode + 1;


		-- Get los datos de los clientes creados de manera asyncrona NEW CARACTERISTICAS
	
		--SELECT dpCt.ACCOUNTNUM, dpCt.DPNUMBERDOCUMID_PE, dpCt.DPTYPEDOCID_PE  
		--FROM [ax].RETAILASYNCCUSTOMERV2 rac
		--INNER JOIN  ext.DPCUSTTABLE_PE dpCt  ON rac.CUSTACCOUNTASYNC = dpCT.CustAccountAsync
		--AND rac.DATAAREAID = dpCT.DATAAREAID
		--WHERE  rac.REPLICATIONCOUNTERFROMORIGIN= @partyId AND rac.DATAAREAID = @nvc_DataAreaId

		--SET @i_ReturnCode = @i_ReturnCode + 1;


	RETURN @i_ReturnCode;
END;
GO

GRANT EXECUTE ON [ext].[DPGETCUSTOMERPARTYID_PE] TO [UsersRole];
GO

GRANT EXECUTE ON [ext].[DPGETCUSTOMERPARTYID_PE] TO [DeployExtensibilityRole];
GO