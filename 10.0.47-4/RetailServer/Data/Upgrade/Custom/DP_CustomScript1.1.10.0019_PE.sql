

IF OBJECT_ID(N'[ext].[DPGETCUSTOMERSEARCHRESULTS_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPGETCUSTOMERSEARCHRESULTS_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPGETCUSTOMERSEARCHRESULTS_PE]';
END
GO

ALTER PROCEDURE [ext].[DPGETCUSTOMERSEARCHRESULTS_PE]
(
  @tvp_QueryResultSettings [crt].[QUERYRESULTSETTINGSTABLETYPE] READONLY,
    @nvc_SearchText       NVARCHAR(255),  -- length is 255 because [ax].LOGISTICSELECTRONICADDRESS.LOCATOR has a length of 255 and is the longest compared string.
    @nvc_DataAreaId       NVARCHAR(4) = '', -- default value for backward compatibility
	@bi_ChannelId         BIGINT
)
AS
BEGIN
    SET NOCOUNT ON

	set @nvc_SearchText = REPLACE(@nvc_SearchText,' ','')

	DECLARE @TotalSearch INT = 0;

    DECLARE @tvp_CustomerSearchByNameResults TABLE
    (
        PARTYID BIGINT NULL,
        ISASYNCCUSTOMER INT NULL,
        RANKING INT NULL
    )

    DECLARE @tvp_MergedCustomerSearchResults TABLE
    (
        PARTYID BIGINT NULL,
        ISASYNCCUSTOMER INT NULL,
        RANKING INT NULL
    )


	INSERT @tvp_CustomerSearchByNameResults
	EXEC  [ext].[DPCUSTOMERSEARCHBYNUMDOCUMENT_PE] @nvc_SearchText, @nvc_DataAreaId, @bi_ChannelId 	

	SELECT @TotalSearch = COUNT(PARTYID)   FROM @tvp_CustomerSearchByNameResults

	IF (@TotalSearch = 0)
	BEGIN
		INSERT @tvp_CustomerSearchByNameResults
		EXEC  [ext].[DPCUSTABLESEARCHBYNUMDOCUMENT_PE] @nvc_SearchText, @nvc_DataAreaId, @bi_ChannelId 	
	END
	

    --INSERT @tvp_CustomerSearchByElectronicAddressResults
    --EXEC [crt].[CUSTOMERSEARCHBYELECTRONICADDRESS] @nvc_SearchText, @nvc_DataAreaId

    INSERT @tvp_MergedCustomerSearchResults
    SELECT PARTYID, 0 AS ISASYNCCUSTOMER, SUM(RANKING) AS RANKING
    FROM (
        SELECT * FROM @tvp_CustomerSearchByNameResults
    ) mergedResults
    GROUP BY mergedResults.PARTYID

    SELECT * FROM (
        SELECT
            ISNULL([ct].ACCOUNTNUM, '') AS ACCOUNTNUMBER,
            CASE
              WHEN dpn.RECID IS NULL THEN 2 -- Organization if RECID is null
              ELSE 1 -- Customer
            END AS CUSTOMERTYPE,
            ISNULL([ceae].LOCATOR,'') AS EMAIL,
            ISNULL([lpa].ADDRESS,'') AS FULLADDRESS,
            [dpt].NAME AS NAME,
            ISNULL(CAST(N'' AS XML).value ('xs:base64Binary(xs:hexBinary(sql:column("[rmr].[RESOURCEBLOB]")))', 'NVARCHAR(MAX)'),'') AS OFFLINEIMAGE,
            [dpt].PARTYNUMBER,
            ISNULL([ceap].LOCATOR,'') AS PHONE,
            [dpt].RECID AS RECORDID,
            mergedResults.ISASYNCCUSTOMER AS ISASYNCCUSTOMER, -- 0 AS ISASYNCCUSTOMER
            mergedResults.RANKING AS RANKING
        FROM @tvp_MergedCustomerSearchResults mergedResults
        INNER JOIN [ax].DIRPARTYTABLE dpt ON [dpt].RECID = mergedResults.PARTYID
        -- Global customers are not stored in [ax].CUSTTABLE. Hence, a LEFT OUTER JOIN is being performed here.
        LEFT OUTER JOIN [ax].CUSTTABLE ct ON [ct].PARTY = [dpt].RECID AND [ct].DATAAREAID = @nvc_DataAreaId
        LEFT OUTER JOIN [ax].DIRPERSONNAME dpn ON dpn.PERSON = dpt.RECID AND (GETUTCDATE() BETWEEN dpn.VALIDFROM AND dpn.VALIDTO)
        -- phone
        LEFT OUTER JOIN [crt].CUSTOMERELECTRONICADDRESSESVIEW ceap ON [dpt].RECID = [ceap].DIRPARTYRECORDID AND [ceap].METHODYTPE = 1 AND [ceap].ISPRIMARY = 1
        -- email
        LEFT OUTER JOIN [crt].CUSTOMERELECTRONICADDRESSESVIEW ceae ON [dpt].RECID = [ceae].DIRPARTYRECORDID AND [ceae].METHODYTPE = 2 AND [ceae].ISPRIMARY = 1
        -- address
        LEFT OUTER JOIN [ax].DIRPARTYLOCATION dpl ON [dpt].RECID = [dpl].PARTY and [dpl].ISPRIMARY = 1
        LEFT OUTER JOIN [ax].LOGISTICSLOCATION ll ON [dpl].LOCATION = [ll].RECID and [ll].ISPOSTALADDRESS = 1
        LEFT OUTER JOIN [ax].LOGISTICSPOSTALADDRESS lpa ON [ll].RECID = [lpa].LOCATION and  ([lpa].VALIDTO >= GETUTCDATE()) AND ([lpa].VALIDFROM <= GETUTCDATE()) AND ([lpa].ISPRIVATE = 0)
        -- offline images
        LEFT OUTER JOIN [ax].RETAILMEDIAANDMASTERENTITYRELATION rmamer ON [ct].RECID = [rmamer].MASTERENTITYRECID AND [rmamer].ISDEFAULT = 1
        LEFT OUTER JOIN [ax].RETAILMEDIARESOURCE rmr ON [rmamer].MEDIARESOURCEID = [rmr].RESOURCEID

			UNION ALL
		-- NEW ASYNCRONOS CARACTERISTICAS
		SELECT ACCOUNTNUMBER, CUSTOMERTYPE, EMAIL, FULLADDRESS, NAME, OFFLINEIMAGE, 
			PARTYNUMBER, PHONE, RECORDID, ISASYNCCUSTOMER, RANKING
        FROM (

        SELECT
            ISNULL([rac].CUSTACCOUNTASYNC, '') AS ACCOUNTNUMBER,
            [rac].RELATIONSHIPTYPE AS CUSTOMERTYPE,
            ISNULL([rac].RECEIPTEMAIL,'') AS EMAIL,
          --  ISNULL([raa].STREET,'') AS FULLADDRESS,
			NULLIF([raa2].STREET, '') AS FULLADDRESS,
            [rac].CUSTNAME AS NAME,
            --NULL AS OFFLINEIMAGE,
			'' AS OFFLINEIMAGE,
            CAST([rac].REPLICATIONCOUNTERFROMORIGIN AS nvarchar(40)) AS PARTYNUMBER,
            ISNULL([rac].PHONE,'') AS PHONE,
			[rac].REPLICATIONCOUNTERFROMORIGIN AS RECORDID,
            [results].ISASYNCCUSTOMER AS ISASYNCCUSTOMER, -- 1 AS ISASYNCCUSTOMER            
            [results].RANKING AS RANKING
		 FROM [EXT].DPCUSTOMERSEARCHASYNCPE(@nvc_SearchText) results
			INNER JOIN EXT.DPCUSTTABLE_PE dpCT ON [dpCT].REPLICATIONCOUNTERFROMORIGIN = [results].PARTYID
			INNER JOIN [ax].RETAILASYNCCUSTOMERV2 rac ON rac.CUSTACCOUNTASYNC = dpCT.CustAccountAsync
		--	LEFT OUTER JOIN [ax].RETAILASYNCADDRESSV2 raa ON [rac].CUSTACCOUNTASYNC = [raa].CUSTACCOUNTASYNC

		OUTER APPLY (
                SELECT TOP 1 [raa2].STREET
                FROM [ax].RETAILASYNCADDRESSV2 raa2
                -- we need to get the latest not deactivated revision
                INNER JOIN (
                    SELECT MAX([raa2].REPLICATIONCOUNTERFROMORIGIN) REPLICATIONCOUNTERFROMORIGIN
                    FROM [ax].RETAILASYNCADDRESSV2 raa2
                    WHERE [raa2].DATAAREAID = @nvc_dataAreaId
                    -- we either have CUSTACCOUNT, both, or only CUSTACCOUNTASYNC column filled
                    GROUP BY COALESCE(raa2.[CUSTACCOUNT], raa2.[CUSTACCOUNTASYNC]), ADDRESSID
                ) raa ON raa2.REPLICATIONCOUNTERFROMORIGIN = raa.REPLICATIONCOUNTERFROMORIGIN
                    AND raa2.OPERATION <> 3 -- 3 = deactivated
                    AND (raa2.CUSTACCOUNT = rac.CUSTACCOUNT AND raa2.CUSTACCOUNT != '' OR raa2.CUSTACCOUNTASYNC = rac.CUSTACCOUNTASYNC) -- can be either sync customer, or async
            ) raa2

		) searchResults
		WHERE RECORDID =
				-- even though custaccountasync cannot be modified, we still need to be sure that it not deactivated
			(   -- we are only interested in the latest state for each cust account
				SELECT MAX([racv2].REPLICATIONCOUNTERFROMORIGIN) PARTYID
				FROM [ax].RETAILASYNCCUSTOMERV2 racv2
				WHERE [racv2].STORERECID = @bi_ChannelId AND [racv2].CUSTACCOUNTASYNC = searchResults.ACCOUNTNUMBER
			)

        UNION ALL

        SELECT
            ISNULL([rac].CUSTACCOUNTASYNC, '') AS ACCOUNTNUMBER,
            [rac].RELATIONSHIPTYPE AS CUSTOMERTYPE,
            ISNULL([rac].RECEIPTEMAIL,'') AS EMAIL,
            ISNULL([raa].STREET,'') AS FULLADDRESS,
            [rac].CUSTNAME AS NAME,
            --NULL AS OFFLINEIMAGE,
			'' AS OFFLINEIMAGE,
            CAST([rac].REPLICATIONCOUNTERFROMORIGIN AS nvarchar(40)) AS PARTYNUMBER,
            ISNULL([rac].PHONE,'') AS PHONE,
			[rac].REPLICATIONCOUNTERFROMORIGIN AS RECORDID,
            [results].ISASYNCCUSTOMER AS ISASYNCCUSTOMER, -- 1 AS ISASYNCCUSTOMER            
            [results].RANKING AS RANKING
		 FROM [EXT].DPCUSTOMERSEARCHASYNCPE(@nvc_SearchText) results
			INNER JOIN EXT.DPCUSTTABLE_PE dpCT ON [dpCT].REPLICATIONCOUNTERFROMORIGIN = [results].PARTYID
			INNER JOIN [ax].RETAILASYNCCUSTOMER rac ON rac.CUSTACCOUNTASYNC = dpCT.CustAccountAsync
			LEFT OUTER JOIN [ax].RETAILASYNCADDRESS raa ON [rac].CUSTACCOUNTASYNC = [raa].CUSTACCOUNTASYNC

	
    ) pagedResults
    ORDER BY
        CASE WHEN (SELECT TOP 1 [ORDERBY] FROM @tvp_QueryResultSettings) = 'Ranking' AND (SELECT TOP 1 [ASCENDING] FROM @tvp_QueryResultSettings) = 1 THEN RANKING END ASC,
        CASE WHEN (SELECT TOP 1 [ORDERBY] FROM @tvp_QueryResultSettings) = 'Ranking' AND (SELECT TOP 1 [ASCENDING] FROM @tvp_QueryResultSettings) = 0 THEN RANKING END DESC,
        CASE WHEN (SELECT TOP 1 [ORDERBY] FROM @tvp_QueryResultSettings) = 'Name' AND (SELECT TOP 1 [ASCENDING] FROM @tvp_QueryResultSettings) = 1 THEN NAME END ASC,
        CASE WHEN (SELECT TOP 1 [ORDERBY] FROM @tvp_QueryResultSettings) = 'Name' AND (SELECT TOP 1 [ASCENDING] FROM @tvp_QueryResultSettings) = 0 THEN NAME END DESC,
        CASE WHEN (SELECT TOP 1 [ORDERBY] FROM @tvp_QueryResultSettings) = 'AccountNumber' AND (SELECT TOP 1 [ASCENDING] FROM @tvp_QueryResultSettings) = 1 THEN ACCOUNTNUMBER END ASC,
        CASE WHEN (SELECT TOP 1 [ORDERBY] FROM @tvp_QueryResultSettings) = 'AccountNumber' AND (SELECT TOP 1 [ASCENDING] FROM @tvp_QueryResultSettings) = 0 THEN ACCOUNTNUMBER END DESC,
        CASE WHEN (SELECT TOP 1 [ORDERBY] FROM @tvp_QueryResultSettings) = 'Email' AND (SELECT TOP 1 [ASCENDING] FROM @tvp_QueryResultSettings) = 1 THEN EMAIL END ASC,
        CASE WHEN (SELECT TOP 1 [ORDERBY] FROM @tvp_QueryResultSettings) = 'Email' AND (SELECT TOP 1 [ASCENDING] FROM @tvp_QueryResultSettings) = 0 THEN EMAIL END DESC
  --  OFFSET (SELECT TOP 1 [SKIP] FROM @tvp_QueryResultSettings) ROWS
  --  FETCH NEXT (SELECT TOP 1 [TOP] FROM @tvp_QueryResultSettings) ROWS ONLY
END;

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
	--SELECT dpCt.ACCOUNTNUM, dpCt.DPNUMBERDOCUMID_PE, dpCt.DPTYPEDOCID_PE  
	--FROM [ax].RETAILASYNCCUSTOMER rac
	--INNER JOIN  ext.DPCUSTTABLE_PE dpCt  ON rac.CUSTACCOUNTASYNC = dpCT.CustAccountAsync
	--	AND rac.DATAAREAID = dpCT.DATAAREAID
	--	WHERE  rac.REPLICATIONCOUNTERFROMORIGIN= @partyId AND rac.DATAAREAID = @nvc_DataAreaId;

	--SET @i_ReturnCode = @i_ReturnCode + 1;

	-- Get los datos de los clientes en la tabla que son obtenidos del HQ Pero aún no ha sido actualizado sus datos
	SELECT dpCt.ACCOUNTNUM, dpCt.DPNUMBERDOCUMID_PE, dpCt.DPTYPEDOCID_PE 
	FROM  [ax].DIRPARTYTABLE dpt         
    LEFT OUTER JOIN [ax].CUSTTABLE ct ON [ct].PARTY = [dpt].RECID AND [ct].DATAAREAID = @nvc_DataAreaId
	LEFT OUTER JOIN [ax].RETAILCUSTTABLE rct ON  rct.ACCOUNTNUM = ct.ACCOUNTNUM
	LEFT OUTER JOIN ext.DPCUSTTABLE_PE dpCt ON  rct.CUSTACCOUNTASYNC = dpCt.ACCOUNTNUM  AND dpCt.DATAAREAID = ct.DATAAREAID
		WHERE  [dpt].RECID = @partyId AND dpCt.DATAAREAID = @nvc_DataAreaId;
	SET @i_ReturnCode = @i_ReturnCode + 1;


		-- Get los datos de los clientes creados de manera asyncrona NEW CARACTERISTICAS
	
		SELECT dpCt.ACCOUNTNUM, dpCt.DPNUMBERDOCUMID_PE, dpCt.DPTYPEDOCID_PE  
		FROM [ax].RETAILASYNCCUSTOMERV2 rac
		INNER JOIN  ext.DPCUSTTABLE_PE dpCt  ON rac.CUSTACCOUNTASYNC = dpCT.CustAccountAsync
		AND rac.DATAAREAID = dpCT.DATAAREAID
		WHERE  rac.REPLICATIONCOUNTERFROMORIGIN= @partyId AND rac.DATAAREAID = @nvc_DataAreaId

		SET @i_ReturnCode = @i_ReturnCode + 1;


	RETURN @i_ReturnCode;
END;
GO
