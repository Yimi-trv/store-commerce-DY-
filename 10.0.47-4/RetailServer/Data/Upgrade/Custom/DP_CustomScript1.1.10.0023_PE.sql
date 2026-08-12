IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPRetailSalesTaxOverride_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPRetailSalesTaxOverride_PEVIEW];
END
GO
CREATE VIEW [ext].[DPRetailSalesTaxOverride_PEVIEW]
AS		
	Select RSTO.DESTINATIONITEMTAXGROUP, RSTOG.CODE, RST.RECID ChannelId, RST.STORENUMBER, T2.INVENTLOCATIONDATAAREAID DATAAREAID
	FROM ax.RETAILSTORETABLE RST
	INNER JOIN ax.RETAILCHANNELTABLE T2
			ON RST.RECID = T2.RECID
	INNER JOIN ax.RETAILSALESTAXOVERRIDEGROUP RSTOG
	ON RST.TAXOVERRIDEGROUP = RSTOG.RECID
	INNER JOIN ax.RetailSalesTaxOverrideGroupMember RSTOGM
	ON RSTOG.CODE = RSTOGM.RBOSALESTAXOVERRIDEGROUPCODE
	INNER JOIN ax.RETAILSALESTAXOVERRIDE RSTO 
	ON RSTOGM.RBOSALESTAXOVERRIDECODE = RSTO.CODE

GO


IF OBJECT_ID(N'[ext].[DPGETCUSTOMERSEARCHRESULTSV2_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPGETCUSTOMERSEARCHRESULTSV2_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPGETCUSTOMERSEARCHRESULTSV2_PE].';
END
GO
ALTER PROCEDURE [ext].[DPGETCUSTOMERSEARCHRESULTSV2_PE]
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
		SELECT @TotalSearch = COUNT(PARTYID)   FROM @tvp_CustomerSearchByNameResults -- NEW Cust
	END

	IF (@TotalSearch = 0)
	BEGIN
		INSERT @tvp_CustomerSearchByNameResults
		SELECT
			[rac].REPLICATIONCOUNTERFROMORIGIN AS RECORDID,
            [results].ISASYNCCUSTOMER AS ISASYNCCUSTOMER, -- 1 AS ISASYNCCUSTOMER            
            [results].RANKING AS RANKING
		 FROM [EXT].DPCUSTOMERSEARCHASYNCPE(@nvc_SearchText) results
			INNER JOIN EXT.DPCUSTTABLE_PE dpCT ON [dpCT].REPLICATIONCOUNTERFROMORIGIN = [results].PARTYID
			INNER JOIN [ax].RETAILASYNCCUSTOMER rac ON rac.CUSTACCOUNTASYNC = dpCT.CustAccountAsync
			LEFT OUTER JOIN [ax].RETAILASYNCADDRESS raa ON [rac].CUSTACCOUNTASYNC = [raa].CUSTACCOUNTASYNC
	end
	
    INSERT @tvp_MergedCustomerSearchResults
    SELECT PARTYID, 0 AS ISASYNCCUSTOMER, SUM(RANKING) AS RANKING
    FROM (
        SELECT * FROM @tvp_CustomerSearchByNameResults
    ) mergedResults
    GROUP BY mergedResults.PARTYID


	SELECT * FROM @tvp_MergedCustomerSearchResults

END

