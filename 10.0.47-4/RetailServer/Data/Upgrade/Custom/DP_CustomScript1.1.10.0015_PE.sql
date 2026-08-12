SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- DESARROLLO ACTUALIZACIÓN DE DATOS ADICIONALES DE HQ A RETAIL

-- Campo que contiene la ultima actualizacion del HQ enviado por el POS
--IF  EXISTS (SELECT * FROM sys.objects 
--	WHERE object_id = OBJECT_ID(N'[ext].[CUSTTABLE]') AND type in (N'U'))
--BEGIN
--	ALTER TABLE [ext].[CUSTTABLE]
--	ADD [DPISCREATEDMODIFIEDHQ_PE] [int] NOT NULL DEFAULT ((1)) 
--END	

--GO



IF OBJECT_ID(N'[ext].[DPISCREATEDMODIFIEDHQ_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPISCREATEDMODIFIEDHQ_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPISCREATEDMODIFIEDHQ_PE].';
END
GO

ALTER PROCEDURE [ext].[DPISCREATEDMODIFIEDHQ_PE]
    @nvc_DataAreaId                         NVARCHAR(4)
	
AS
BEGIN
	-- 13012022 Actualizando a los clientes modificados del HQ hacia el MPOS Han sido enviado recientemente isCreatedHQ = 1
	UPDATE CustT1
		SET CustT1.DPTYPEDOCID_PE		= CustT2.DPTYPEDOCID_PE,
			CustT1.DPNUMBERDOCUMID_PE	= CustT2.DPNUMBERDOCUMID_PE,
			CustT1.DPAGENTPERCEPTION_PE	= CustT2.DPAGENTPERCEPTION_PE,
			CustT1.DPAGENTRETENTION_PE	= CustT2.DPAGENTRETENTION_PE,
			CustT1.DPEMERGENCYZONE_PE	= CustT2.DPEMERGENCYZONE_PE,
			CustT1.DPEXONERATEDPERCEPTION_PE	= CustT2.DPEXONERATEDPERCEPTION_PE,
			CustT1.DPFINALCONSUMER_PE	= CustT2.DPFINALCONSUMER_PE,
			CustT1.DPNOTDOMICILED_PE	= CustT2.DPNOTDOMICILED_PE,
			CustT1.DPOTHERS_PE			= CustT2.DPOTHERS_PE,
			CustT1.DPPUBLICSECTOR_PE	= CustT2.DPPUBLICSECTOR_PE
	FROM ext.DPCUSTTABLE_PE CustT1
	INNER JOIN EXT.CUSTTABLE CustT2
	ON CustT1.ACCOUNTNUM = CustT2.ACCOUNTNUM
	AND CustT1.DATAAREAID = CustT2.DATAAREAID
	AND CustT2.DPISCREATEDMODIFIEDHQ_PE = 1
	WHERE CustT2.DATAAREAID = @nvc_DataAreaId	

	-- DPISCREATEDMODIFIEDHQ_PE = 0 No volver a actualizarlo
	UPDATE  CustT3
		SET CustT3.DPISCREATEDMODIFIEDHQ_PE = 0
	FROM EXT.CUSTTABLE CustT3
	WHERE  CustT3.DATAAREAID = @nvc_DataAreaId
	-- Fin 13012022 
END

GO


-- DESARROLLO CAMPO MODETYPEMPOS PARA SECUENCIA NUMERICA

-- Campo que contiene la ultima actualizacion del HQ enviado por el POS
IF  EXISTS (SELECT * FROM sys.objects 
	WHERE object_id = OBJECT_ID(N'[ext].[DPOSS_RETAILRECEIPTMASKS_PE]') AND type in (N'U'))
BEGIN
	ALTER TABLE [ext].[DPOSS_RETAILRECEIPTMASKS_PE]
	ADD [MODETYPEMPOS] [int] NOT NULL DEFAULT ((0)) 
END	

GO

-- Campo que contiene la ultima actualizacion del HQ enviado por el POS
IF  EXISTS (SELECT * FROM sys.objects 
	WHERE object_id = OBJECT_ID(N'[ext].[DPRETAILPOSSEEDDATA_PE]') AND type in (N'U'))
BEGIN
	ALTER TABLE [ext].[DPRETAILPOSSEEDDATA_PE]
	ADD [MODETYPEMPOS] [int] NOT NULL DEFAULT ((0)) 
END	

GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPOSS_RetailReceiptMasksV2_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPOSS_RetailReceiptMasksV2_PEVIEW];
END
GO
CREATE VIEW [ext].[DPOSS_RetailReceiptMasksV2_PEVIEW]
AS
	SELECT T1.MASK, ISNULL(T3.DATAVALUE,0) DATAVALUE, T1.DPOSS_DOCUMENTTYPE_PE, 
			T1.DPOSS_REFDOCUMENTTYPE_PE, T1.RECEIPTTRANSTYPE, T2.FUNCTIONALITYPROFILE, 
			T2.STORENUMBER, T2.RECID ChannelId, T1.RECID,
			T1.TERMINALID, T1.DATAAREAID, T1.MODETYPEMPOS
	FROM ext.DPOSS_RetailReceiptMasks_PE T1
	INNER JOIN ax.RETAILSTORETABLE T2	
	ON T1.FUNCPROFILEID = T2.FUNCTIONALITYPROFILE
	LEFT JOIN ext.DPRETAILPOSSEEDDATA_PE T3
		ON T1.DPOSS_DOCUMENTTYPE_PE = T3.DPOSS_DOCUMENTTYPE_PE
		AND T1.DPOSS_REFDOCUMENTTYPE_PE = T3.DPOSS_REFDOCUMENTTYPE_PE
		AND T1.FUNCPROFILEID = T3.FUNCPROFILEID
		AND T1.RECEIPTTRANSTYPE = T3.RECEIPTTRANSTYPE
		AND T1.TERMINALID = T3.TERMINALID
		AND T1.DATAAREAID = T3.DATAAREAID
		AND T1.MODETYPEMPOS = T3.MODETYPEMPOS

GO




--****** Object:  StoredProcedure [ext].[DPSETNumberValue_PE]    Script Date: 5/23/2019 10:48:29 PM ******

IF OBJECT_ID(N'[ext].[DPSETNumberDataValue_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPSETNumberDataValue_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPSETNumberDataValue_PE].';
END
GO

ALTER PROCEDURE [ext].[DPSETNumberDataValue_PE]
	@RecId									BIGINT,
	@newDataValue							BIGINT,
	@DPOSSREFDOCUMENTTYPE					nvarchar(10),
	@DPOSSDOCUMENTTYPEPE					nvarchar(10),
	@FUNCPROFILEID							nvarchar(10),
	@RECEIPTTRANSTYPE						int,	
	@TERMINALID								nvarchar(10),
    @nvc_DataAreaId                         NVARCHAR(4),
	@MODETYPEMPOS							int	
AS
BEGIN

    SET NOCOUNT ON;

    DECLARE @i_ReturnCode                           INT;
    DECLARE @i_TransactionIsOurs                    INT;
    DECLARE @i_Error                                INT;



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



				MERGE ext.DPRETAILPOSSEEDDATA_PE AS target	
				USING (
						SELECT	@RecId				  AS RecId,
								@newDataValue		  AS DataValue,
								@DPOSSREFDOCUMENTTYPE AS DPOSSREFDOCUMENTTYPE,
								@DPOSSDOCUMENTTYPEPE AS DPOSSDOCUMENTTYPEPE,
								@FUNCPROFILEID AS FUNCPROFILEID,
								@RECEIPTTRANSTYPE AS RECEIPTTRANSTYPE,
								@TERMINALID AS TERMINALID,							
								@nvc_DataAreaId AS 	DATAAREAID,
								@MODETYPEMPOS AS MODETYPEMPOS) AS source		
				ON (		target.TERMINALID				= source.TERMINALID
						AND target.RECEIPTTRANSTYPE			= source.RECEIPTTRANSTYPE
						AND target.FUNCPROFILEID			= source.FUNCPROFILEID
						AND target.DPOSS_REFDOCUMENTTYPE_PE	= source.DPOSSREFDOCUMENTTYPE
						AND target.DPOSS_DOCUMENTTYPE_PE	= source.DPOSSDOCUMENTTYPEPE
						AND target.DATAAREAID				= source.DATAAREAID
						AND target.MODETYPEMPOS				= source.MODETYPEMPOS)
				WHEN MATCHED THEN
					   UPDATE SET DATAVALUE		= Source.DataValue
				WHEN NOT MATCHED THEN
					INSERT ( TERMINALID,					RECEIPTTRANSTYPE,							
							 FUNCPROFILEID,					DPOSS_REFDOCUMENTTYPE_PE,		
							 DPOSS_DOCUMENTTYPE_PE,			DATAAREAID,					
							 DATAVALUE,						RecId,
							 MODETYPEMPOS)
					VALUES ( Source.TERMINALID,				Source.RECEIPTTRANSTYPE,					
							 Source.FUNCPROFILEID,			Source.DPOSSREFDOCUMENTTYPE,	
							 Source.DPOSSDOCUMENTTYPEPE,	Source.DATAAREAID,
							 Source.DataValue,				Source.RecId,
							 Source.MODETYPEMPOS);

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
END;

GO

-- DESARROLLO FORMATO DE BOLETA

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPLOGISTICSELECTRONICADDRESS_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPLOGISTICSELECTRONICADDRESS_PEVIEW];
END
GO
CREATE VIEW [ext].[DPLOGISTICSELECTRONICADDRESS_PEVIEW]
AS
	SELECT T1.ACCOUNTNUM, T3.TYPE,  T3.DESCRIPTION, T3.LOCATOR 
	FROM  ax.CUSTTABLE AS T1
	INNER JOIN ax.DIRPARTYLOCATION T2
	ON T1.PARTY = T2.PARTY
	INNER JOIN AX.LOGISTICSELECTRONICADDRESS T3
	ON T3.LOCATION = T2.LOCATION
	AND T3.ISPRIMARY = 1
GO




---- Tabla Local que almacene los tipos de Impuestos con  nombres abreviados y establecer el orden
--IF  EXISTS (SELECT * FROM sys.objects 
--	WHERE object_id = OBJECT_ID(N'[ext].[DPTAXTYPENAMEORDER_PE]') AND type in (N'U'))
--BEGIN
--	DROP TABLE [ext].[DPTAXTYPENAMEORDER_PE]
--END	
--GO
--CREATE TABLE [ext].[DPTAXTYPENAMEORDER_PE](
--	[TAXTYPEID] [int] NOT NULL,
--	[NAME] [nvarchar](20) NOT NULL,
--	[NORDER] [int] NOT NULL
--	CONSTRAINT [PK_TAXTYPEIDPE] PRIMARY KEY CLUSTERED 
--(
--	[TAXTYPEID] ASC	
--)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
--) ON [PRIMARY]
--GO

--ALTER TABLE [ext].[DPTAXTYPENAMEORDER_PE] ADD  DEFAULT ((0)) FOR [TAXTYPEID]
--GO
--ALTER TABLE [ext].[DPTAXTYPENAMEORDER_PE] ADD  DEFAULT ('') FOR [NAME]
--GO
--ALTER TABLE [ext].[DPTAXTYPENAMEORDER_PE] ADD  DEFAULT ((0)) FOR [NORDER]
--GO

--GRANT SELECT,INSERT,UPDATE,DELETE ON [ext].[DPTAXTYPENAMEORDER_PE] TO [DeployExtensibilityRole];
--GO
--GRANT SELECT,INSERT,UPDATE,DELETE ON [ext].[DPTAXTYPENAMEORDER_PE] TO [UsersRole];
--GO
--GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::[ext].[DPTAXTYPENAMEORDER_PE] TO [DataSyncUsersRole]
--GO


INSERT INTO [ext].[DPTAXTYPENAMEORDER_PE](
	TAXTYPEID, NAME, NORDER)
VALUES (0,'PERCEPCIÓN',6),
		(1,'IGV',2),
		(2,'ISC',1),
		(3,'RETENCIÓN 4TA',7),
		(4,'RETENCIÓN NO DOMIC.',8),
		(5,'NO GRAVADA',4),
		(6,'EXONERADA',5),
		(7,'ICBP',3)

GO

-- DESARROLLO TIPO DE PAGO - TRANSFERENCIA GRATUITA


--IF  EXISTS (SELECT * FROM sys.objects 
--	WHERE object_id = OBJECT_ID(N'[ext].[RETAILTENDERTYPETABLE]') AND type in (N'U'))
--BEGIN
--	DROP TABLE [ext].[RETAILTENDERTYPETABLE]
--END	

--CREATE TABLE [ext].[RETAILTENDERTYPETABLE](
--	[DPFREETITLE_PE] [int] NOT NULL,
--	[RECID] [bigint] NOT NULL,
-- CONSTRAINT [PK_RECIDRETAILTENDERTYPETABLE] PRIMARY KEY CLUSTERED 
--(
--	[RECID] ASC
--)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
--) ON [PRIMARY]
--GO

--ALTER TABLE [ext].[RETAILTENDERTYPETABLE] ADD  DEFAULT  ((0))  FOR [DPFREETITLE_PE]
--GO

--Grant SELECT, INSERT, UPDATE, DELETE ON ext.RETAILTENDERTYPETABLE TO UsersRole;
--GO
--Grant SELECT, INSERT, UPDATE, DELETE ON ext.RETAILTENDERTYPETABLE TO DeployExtensibilityRole;
--GO
--GRANT SELECT, INSERT, UPDATE, DELETE ON OBJECT::ext.RETAILTENDERTYPETABLE TO DataSyncUsersRole;
--GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPRETAILTENDERTYPETABLEEXT_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPRETAILTENDERTYPETABLEEXT_PEVIEW];
END
GO
CREATE VIEW [ext].[DPRETAILTENDERTYPETABLEEXT_PEVIEW]
AS
	SELECT T1.TENDERTYPEID, T1.NAME, ISNULL(T2.DPFREETITLE_PE,0)  DPFREETITLE_PE
	FROM AX.RETAILTENDERTYPETABLE T1
	LEFT JOIN EXT.RETAILTENDERTYPETABLE T2
	ON T1.RECID = T2.RECID
GO

-- DESARROLLO BUSQUEDAD DE CLIENTES POR RUC CUANDO SE MODIFICA DATOS ADICIONALES EN EL HQ Y CUANDO SE MODIFICA LA LIBRETA DE DIRECCIONES 


IF OBJECT_ID(N'[ext].[DPCUSTOMERSEARCHBYNUMDOCUMENT_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPCUSTOMERSEARCHBYNUMDOCUMENT_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPCUSTOMERSEARCHBYNUMDOCUMENT_PE]';
END
GO


ALTER PROCEDURE [ext].[DPCUSTOMERSEARCHBYNUMDOCUMENT_PE]
    @nvc_SearchText       NVARCHAR(255),  -- length is 255 because [ax].LOGISTICSELECTRONICADDRESS.LOCATOR has a length of 255 and is the longest compared string.
    @nvc_DataAreaId       NVARCHAR(4) = '', -- default value for backward compatibility
	@bi_ChannelId         BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
	
	set @nvc_SearchText = REPLACE(@nvc_SearchText,' ','')

    SELECT PARTYID, 0 AS ISASYNCCUSTOMER, SUM(RANKING) AS RANKING
    FROM (
        -- search by account number
        SELECT
            [ct].PARTY AS PARTYID, COALESCE([AccountNumberFullText_Key].[RANK], 0) AS RANKING
        FROM CONTAINSTABLE([ext].[DPCUSTTABLE_PE], [DPNUMBERDOCUMID_PE], @nvc_SearchText, 500 /* @i_MaxTop - Retrieving only TOP 500 customers because retrieving more customers will degrade performance */) AccountNumberFullText_Key
        INNER JOIN [ext].DPCUSTTABLE_PE dpct ON [dpct].REPLICATIONCOUNTERFROMORIGIN = [AccountNumberFullText_Key].[KEY]
					AND dpct.DPNUMBERDOCUMID_PE = @nvc_SearchText 
		INNER JOIN [ax].CUSTTABLE ct ON [ct].ACCOUNTNUM = [dpct].ACCOUNTNUM
        INNER JOIN [ax].DIRPARTYTABLE dpl ON [ct].PARTY = [dpl].RECID
		INNER JOIN [ax].DIRADDRESSBOOKPARTY dabp ON [dabp].PARTY = [dpl].RECID
        INNER JOIN [ax].RETAILSTOREADDRESSBOOK rsab ON [dabp].ADDRESSBOOK = [rsab].ADDRESSBOOK AND [rsab].STORERECID = @bi_ChannelId AND [rsab].ADDRESSBOOKTYPE = 0  -- The customer address book type
        LEFT JOIN [ax].OMINTERNALORGANIZATION oio ON [dpl].RECID = oio.RECID
        WHERE [ct].DATAAREAID = @nvc_DataAreaId    
		
		UNION ALL
		-- Search by acountNumber pero los que han sido enviados desde HQ al POS pero aun no han actualizado el campo ACCOUNNUM Con su nuevo codigo
		SELECT
            [ct].PARTY AS PARTYID, COALESCE([AccountNumberFullText_Key].[RANK], 0) AS RANKING
        FROM CONTAINSTABLE([ext].[DPCUSTTABLE_PE], [DPNUMBERDOCUMID_PE], @nvc_SearchText, 500 /* @i_MaxTop - Retrieving only TOP 500 customers because retrieving more customers will degrade performance */) AccountNumberFullText_Key
        INNER JOIN [ext].DPCUSTTABLE_PE dpct ON [dpct].REPLICATIONCOUNTERFROMORIGIN = [AccountNumberFullText_Key].[KEY]
				AND dpct.DPNUMBERDOCUMID_PE = @nvc_SearchText
		INNER JOIN [ax].RETAILCUSTTABLE rct ON  rct.CUSTACCOUNTASYNC = dpct.ACCOUNTNUM
		INNER JOIN [ax].CUSTTABLE ct ON [ct].ACCOUNTNUM = rct.ACCOUNTNUM
        INNER JOIN [ax].DIRPARTYTABLE dpl ON [ct].PARTY = [dpl].RECID
		INNER JOIN [ax].DIRADDRESSBOOKPARTY dabp ON [dabp].PARTY = [dpl].RECID
        INNER JOIN [ax].RETAILSTOREADDRESSBOOK rsab ON [dabp].ADDRESSBOOK = [rsab].ADDRESSBOOK AND [rsab].STORERECID = @bi_ChannelId AND [rsab].ADDRESSBOOKTYPE = 0  -- The customer address book type
        LEFT JOIN [ax].OMINTERNALORGANIZATION oio ON [dpl].RECID = oio.RECID
        WHERE [ct].DATAAREAID = @nvc_DataAreaId
		
		UNION ALL

		SELECT 
            [ct].PARTY AS PARTYID, COALESCE([AccountNumberFullText_Key].[RANK], 0) AS RANKING
        FROM CONTAINSTABLE([EXT].[CUSTTABLE], [DPNUMBERDOCUMID_PE], @nvc_SearchText, 500 /* @i_MaxTop - Retrieving only TOP 500 customers because retrieving more customers will degrade performance */) AccountNumberFullText_Key   
		INNER JOIN [ax].CUSTTABLE ct ON [ct].RECID = [AccountNumberFullText_Key].[KEY] -- [dpct].ACCOUNTNUM
        INNER JOIN [ax].DIRPARTYTABLE dpl ON [ct].PARTY = [dpl].RECID
		INNER JOIN [ax].DIRADDRESSBOOKPARTY dabp ON [dabp].PARTY = [dpl].RECID
        INNER JOIN [ax].RETAILSTOREADDRESSBOOK rsab ON [dabp].ADDRESSBOOK = [rsab].ADDRESSBOOK AND [rsab].STORERECID = @bi_ChannelId AND [rsab].ADDRESSBOOKTYPE = 0  -- The customer address book type
        LEFT JOIN [ax].OMINTERNALORGANIZATION oio ON [dpl].RECID = oio.RECID
        WHERE [ct].DATAAREAID =  @nvc_DataAreaId 
		AND NOT EXISTS 
		(SELECT * FROM [ext].[DPCUSTTABLE_PE] NTE
		 WHERE NTE.ACCOUNTNUM = ct.ACCOUNTNUM)


    )  results   
    GROUP BY [results].PARTYID


END;
GO 




IF OBJECT_ID(N'[ext].[DPCUSTABLESEARCHBYNUMDOCUMENT_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPCUSTABLESEARCHBYNUMDOCUMENT_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPCUSTABLESEARCHBYNUMDOCUMENT_PE]';
END
GO


ALTER PROCEDURE [ext].[DPCUSTABLESEARCHBYNUMDOCUMENT_PE]
    @nvc_SearchText       NVARCHAR(255),  -- length is 255 because [ax].LOGISTICSELECTRONICADDRESS.LOCATOR has a length of 255 and is the longest compared string.
    @nvc_DataAreaId       NVARCHAR(4) = '', -- default value for backward compatibility
	@bi_ChannelId         BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

	set @nvc_SearchText = REPLACE(@nvc_SearchText,' ','')

    SELECT PARTYID, 0 AS ISASYNCCUSTOMER, SUM(RANKING) AS RANKING
    FROM (
        -- search by account number
        SELECT
            [ct].PARTY AS PARTYID, COALESCE([AccountNumberFullText_Key].[RANK], 0) AS RANKING
        FROM CONTAINSTABLE([ext].[CUSTTABLE], [DPNUMBERDOCUMID_PE], @nvc_SearchText, 500 /* @i_MaxTop - Retrieving only TOP 500 customers because retrieving more customers will degrade performance */) AccountNumberFullText_Key
        INNER JOIN [ext].CUSTTABLE dpct ON [dpct].RECID = [AccountNumberFullText_Key].[KEY]
			AND dpct.DPNUMBERDOCUMID_PE = @nvc_SearchText
		INNER JOIN [ax].CUSTTABLE ct ON [ct].ACCOUNTNUM = [dpct].ACCOUNTNUM
        INNER JOIN [ax].DIRPARTYTABLE dpl ON [ct].PARTY = [dpl].RECID
		INNER JOIN [ax].DIRADDRESSBOOKPARTY dabp ON [dabp].PARTY = [dpl].RECID
        INNER JOIN [ax].RETAILSTOREADDRESSBOOK rsab ON [dabp].ADDRESSBOOK = [rsab].ADDRESSBOOK AND [rsab].STORERECID = @bi_ChannelId AND [rsab].ADDRESSBOOKTYPE = 0  -- The customer address book type
        LEFT JOIN [ax].OMINTERNALORGANIZATION oio ON [dpl].RECID = oio.RECID
        WHERE [ct].DATAAREAID = @nvc_DataAreaId    
    )  results   
    GROUP BY [results].PARTYID

END;

GO




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