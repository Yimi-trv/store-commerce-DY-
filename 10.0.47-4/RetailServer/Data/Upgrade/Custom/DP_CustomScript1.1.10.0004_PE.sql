SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- DEFINICION DE TABLE TYPE
--****** Object:  UserDefinedTableType [ext].[DPCUSTOMERTABLETYPE_PE]    Script Date: 5/21/2019 9:43:55 PM ******
IF TYPE_ID('[ext].[DPCUSTOMERTABLETYPE_PE]') IS NOT NULL
BEGIN
	DROP PROCEDURE [ext].[DPCREATEUPDATECUSTOMER_PE]
	DROP TYPE [ext].[DPCUSTOMERTABLETYPE_PE]
END
GO
BEGIN
CREATE TYPE [ext].[DPCUSTOMERTABLETYPE_PE] AS TABLE(
	[ACCOUNTNUMBER] [nvarchar](38) NULL,
	[DPTYPEDOCID_PE] [nvarchar](2) NULL,
	[DPNUMBERDOCUMID_PE] [nvarchar](30) NULL,
	[DPAGENTRETENTION_PE] [int] NULL,
	[DPAGENTPERCEPTION_PE] [int] NULL,
	[DPEXONERATEDPERCEPTION_PE] [int] NULL,
	[DPOTHERS_PE] [int] NULL,
	[DPEMERGENCYZONE_PE] [int] NULL,
	[DPFINALCONSUMER_PE] [int] NULL,
	[DPNOTDOMICILED_PE] [int] NULL,
	[DPPUBLICSECTOR_PE] [int] NULL,
	[DATAAREAID] [nvarchar](4) NULL,
	[PARTITION] [bigint] NULL
)
END
GO


GRANT EXEC ON TYPE::[ext].[DPCUSTOMERTABLETYPE_PE] TO [UsersRole]
GO
GRANT EXEC ON TYPE::[ext].[DPCUSTOMERTABLETYPE_PE] TO [DeployExtensibilityRole];
GO
GRANT EXEC ON TYPE::[ext].[DPCUSTOMERTABLETYPE_PE] TO [DataSyncUsersRole]
GO


-- DEFINICION DE STORE PROCEDURE

IF OBJECT_ID(N'[ext].[DPUPDATEINSERTTRANSACTIONTABLECOUNTER_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPUPDATEINSERTTRANSACTIONTABLECOUNTER_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPUPDATEINSERTTRANSACTIONTABLECOUNTER_PE].';
END
GO
ALTER PROCEDURE [ext].[DPUPDATEINSERTTRANSACTIONTABLECOUNTER_PE]
    @nvc_DataAreaId                         NVARCHAR(4),
	@Channel								BIGINT,
	@Store									NVARCHAR(10),
	@Terminal								NVARCHAR(10),
	@Counter								int,
	@TransactionId							NVARCHAR(44),
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
				MERGE ext.DPTRANSACTIONTABLECOUNTER_PE AS target	
				USING (
						SELECT	@Channel AS CHANNEL,
								@Store AS STORE,
								@Terminal AS TERMINAL,
								@Counter AS COUNTER,
								@TransactionId AS TRANSACTIONID,
								@nvc_DataAreaId AS 	DATAAREAID ) AS source		
				ON (target.CHANNEL				= source.CHANNEL
					AND target.STORE			= source.STORE
					AND target.TERMINAL			= source.TERMINAL
					AND target.TRANSACTIONID	= source.TRANSACTIONID
					AND target.DATAAREAID		= source.DATAAREAID)
				WHEN MATCHED THEN
					UPDATE SET COUNTER		= Source.COUNTER
				WHEN NOT MATCHED THEN
					INSERT ( CHANNEL,						STORE,							
							TERMINAL,						COUNTER,						
							TRANSACTIONID,					DATAAREAID)
					VALUES ( Source.CHANNEL,				Source.STORE,					
							Source.TERMINAL,				Source.COUNTER,			
							Source.TRANSACTIONID,			Source.DATAAREAID );
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



IF OBJECT_ID(N'[ext].[DPCREATEUPDATECUSTOMER_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPCREATEUPDATECUSTOMER_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPCREATEUPDATECUSTOMER_PE].';
END
GO

ALTER PROCEDURE [ext].[DPCREATEUPDATECUSTOMER_PE]
    @TVP_CUSTOMERTABLETYPE                    [ext].[DPCUSTOMERTABLETYPE_PE]   READONLY,
 --   @TVP_EXTENSIONPROPERTIESTABLETYPE [crt].EXTENSIONPROPERTIESTABLETYPE READONLY,
    @bi_ChannelId                             BIGINT,
    @nvc_DataAreaId                           NVARCHAR(4)
AS
BEGIN

      SET NOCOUNT ON;

    DECLARE @i_ReturnCode                           INT;
    DECLARE @i_TransactionIsOurs                    INT;
    DECLARE @i_Error                                INT;
    DECLARE @dtt_ChangeDateTime                     DATETIME;
    DECLARE @dtt_MaxAxDateTime                      DATETIME;
    DECLARE @nvc_PrimaryEmail                       NVARCHAR(10);
    DECLARE @nvc_CustomerAccountNumber              NVARCHAR(20);

	DECLARE @rows BIGINT;
	DECLARE @ACCOUNTNUMBER NVARCHAR(38);
	DECLARE @CustAccountAsync NVARCHAR(38);

	DECLARE @DPTYPEDOCID_PE NVARCHAR(2);
	DECLARE @DPNUMBERDOCUMID_PE NVARCHAR(30);
	DECLARE @DPAGENTRETENTION_PE INT;
	DECLARE @DPAGENTPERCEPTION_PE INT; 
	DECLARE @DPEXONERATEDPERCEPTION_PE INT;
	DECLARE @DPOTHERS_PE INT;
	DECLARE @DPEMERGENCYZONE_PE INT; 
	DECLARE @DPFINALCONSUMER_PE INT;
	DECLARE @DPNOTDOMICILED_PE INT;
	DECLARE @DPPUBLICSECTOR_PE INT;

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


	-- Actualizando Si tiene el codigo AutoGenerado de manera Asincrónico
		UPDATE
			T1 
		SET			 
			T1.DPTYPEDOCID_PE =T2.DPTYPEDOCID_PE,
			T1.DPNUMBERDOCUMID_PE = T2.DPNUMBERDOCUMID_PE,
			T1.DPAGENTRETENTION_PE = T2.DPAGENTRETENTION_PE,
			T1.DPAGENTPERCEPTION_PE = T2.DPAGENTPERCEPTION_PE, 
			T1.DPEXONERATEDPERCEPTION_PE = T2.DPEXONERATEDPERCEPTION_PE,
			T1.DPOTHERS_PE = T2.DPOTHERS_PE,
			T1.DPEMERGENCYZONE_PE = T2.DPEMERGENCYZONE_PE, 
			T1.DPFINALCONSUMER_PE = T2.DPFINALCONSUMER_PE,
			T1.DPNOTDOMICILED_PE = T2.DPNOTDOMICILED_PE,
			T1.DPPUBLICSECTOR_PE = T2.DPPUBLICSECTOR_PE
		FROM
			ext.DPCUSTTABLE_PE AS T1
			INNER JOIN @TVP_CUSTOMERTABLETYPE AS T2
				ON T1.CustAccountAsync = T2.ACCOUNTNUMBER
		WHERE
			T1.DATAAREAID = @nvc_DataAreaId

		IF @@ROWCOUNT = 0 -- Si no actualizado
		BEGIN
		-- Actualizando Si tiene el codigo AutoGenerado de manera Asincrónico
			UPDATE
				T1 
			SET			 
				T1.DPTYPEDOCID_PE =T2.DPTYPEDOCID_PE,
				T1.DPNUMBERDOCUMID_PE = T2.DPNUMBERDOCUMID_PE,
				T1.DPAGENTRETENTION_PE = T2.DPAGENTRETENTION_PE,
				T1.DPAGENTPERCEPTION_PE = T2.DPAGENTPERCEPTION_PE, 
				T1.DPEXONERATEDPERCEPTION_PE = T2.DPEXONERATEDPERCEPTION_PE,
				T1.DPOTHERS_PE = T2.DPOTHERS_PE,
				T1.DPEMERGENCYZONE_PE = T2.DPEMERGENCYZONE_PE, 
				T1.DPFINALCONSUMER_PE = T2.DPFINALCONSUMER_PE,
				T1.DPNOTDOMICILED_PE = T2.DPNOTDOMICILED_PE,
				T1.DPPUBLICSECTOR_PE = T2.DPPUBLICSECTOR_PE
			FROM
				ext.DPCUSTTABLE_PE AS T1
				INNER JOIN @TVP_CUSTOMERTABLETYPE AS T2
					ON T1.ACCOUNTNUM = T2.ACCOUNTNUMBER
			WHERE
				T1.DATAAREAID = @nvc_DataAreaId
			
			IF @@ROWCOUNT = 0 -- Si no Actualizado 
			BEGIN
				-- Obteniendolo en el código CustAccountAsync en las tablas del Retail donde ya deberia encontrarse registrada de manera sincronizado 
				SELECT TOP 1 @CustAccountAsync = T1.CustAccountAsync 
				FROM ax.RETAILCUSTTABLE t1 
					INNER JOIN @TVP_CUSTOMERTABLETYPE t2
				ON T1.ACCOUNTNUM = T2.ACCOUNTNUMBER
					AND T1.DATAAREAID = @nvc_DataAreaId;
				IF @@ROWCOUNT > 0
				BEGIN
					SELECT  @ACCOUNTNUMBER = T2.ACCOUNTNUMBER,
							@DPTYPEDOCID_PE = T2.DPTYPEDOCID_PE,
							@DPNUMBERDOCUMID_PE = T2.DPNUMBERDOCUMID_PE,
							@DPAGENTRETENTION_PE = T2.DPAGENTRETENTION_PE,
							@DPAGENTPERCEPTION_PE = T2.DPAGENTPERCEPTION_PE,
							@DPEXONERATEDPERCEPTION_PE = T2.DPEXONERATEDPERCEPTION_PE,
							@DPOTHERS_PE = T2.DPOTHERS_PE,
							@DPEMERGENCYZONE_PE = T2.DPEMERGENCYZONE_PE,
							@DPFINALCONSUMER_PE = T2.DPFINALCONSUMER_PE,
							@DPNOTDOMICILED_PE = DPNOTDOMICILED_PE,
							@DPPUBLICSECTOR_PE = DPPUBLICSECTOR_PE
					FROM  @TVP_CUSTOMERTABLETYPE T2

					UPDATE
						T1 
					SET
						T1.ACCOUNTNUM	= @ACCOUNTNUMBER,	 
						T1.DPTYPEDOCID_PE = @DPTYPEDOCID_PE,
						T1.DPNUMBERDOCUMID_PE = @DPNUMBERDOCUMID_PE,
						T1.DPAGENTRETENTION_PE = @DPAGENTRETENTION_PE,
						T1.DPAGENTPERCEPTION_PE = @DPAGENTPERCEPTION_PE, 
						T1.DPEXONERATEDPERCEPTION_PE = @DPEXONERATEDPERCEPTION_PE,
						T1.DPOTHERS_PE = @DPOTHERS_PE,
						T1.DPEMERGENCYZONE_PE = @DPEMERGENCYZONE_PE, 
						T1.DPFINALCONSUMER_PE = @DPFINALCONSUMER_PE,
						T1.DPNOTDOMICILED_PE = @DPNOTDOMICILED_PE,
						T1.DPPUBLICSECTOR_PE = @DPPUBLICSECTOR_PE
					FROM
						ext.DPCUSTTABLE_PE AS T1
					WHERE T1.ACCOUNTNUM = @CustAccountAsync												
						AND T1.DATAAREAID = @nvc_DataAreaId	

					IF @@ROWCOUNT = 0
					BEGIN 
						UPDATE
							T1 
						SET
							T1.ACCOUNTNUM	= @ACCOUNTNUMBER,	 
							T1.DPTYPEDOCID_PE = @DPTYPEDOCID_PE,
							T1.DPNUMBERDOCUMID_PE = @DPNUMBERDOCUMID_PE,
							T1.DPAGENTRETENTION_PE = @DPAGENTRETENTION_PE,
							T1.DPAGENTPERCEPTION_PE = @DPAGENTPERCEPTION_PE, 
							T1.DPEXONERATEDPERCEPTION_PE = @DPEXONERATEDPERCEPTION_PE,
							T1.DPOTHERS_PE = @DPOTHERS_PE,
							T1.DPEMERGENCYZONE_PE = @DPEMERGENCYZONE_PE, 
							T1.DPFINALCONSUMER_PE = @DPFINALCONSUMER_PE,
							T1.DPNOTDOMICILED_PE = @DPNOTDOMICILED_PE,
							T1.DPPUBLICSECTOR_PE = @DPPUBLICSECTOR_PE
						FROM
							ext.DPCUSTTABLE_PE AS T1
						WHERE T1.CustAccountAsync = @CustAccountAsync	
							AND @CustAccountAsync != ''											
							AND T1.DATAAREAID = @nvc_DataAreaId	
						IF @@ROWCOUNT = 0
						BEGIN
							insert into ext.DPCUSTTABLE_PE 
							(   CustAccountAsync
								,ACCOUNTNUM
								,DPTYPEDOCID_PE 
								,[DPNUMBERDOCUMID_PE]
								,[DPAGENTRETENTION_PE]
								,[DPAGENTPERCEPTION_PE]
								,[DPEXONERATEDPERCEPTION_PE]
								,[DPOTHERS_PE]
								,[DPEMERGENCYZONE_PE]
								,[DPFINALCONSUMER_PE]
								,[DPNOTDOMICILED_PE]
								,[DPPUBLICSECTOR_PE]
								,[DATAAREAID]  )
							SELECT @CustAccountAsync
								, ex.ACCOUNTNUMBER 
								,ex.[DPTYPEDOCID_PE]
								,ex.[DPNUMBERDOCUMID_PE]
								,ex.[DPAGENTRETENTION_PE]
								,ex.[DPAGENTPERCEPTION_PE]
								,ex.[DPEXONERATEDPERCEPTION_PE]
								,ex.[DPOTHERS_PE]
								,ex.[DPEMERGENCYZONE_PE]
								,ex.[DPFINALCONSUMER_PE]
								,ex.[DPNOTDOMICILED_PE]
								,ex.[DPPUBLICSECTOR_PE]
								,ex.[DATAAREAID]
								from @TVP_CUSTOMERTABLETYPE ex;
						END
					END
				END
				ELSE
					BEGIN
						insert into ext.DPCUSTTABLE_PE 
						(   CustAccountAsync
							,ACCOUNTNUM
							,DPTYPEDOCID_PE 
							,[DPNUMBERDOCUMID_PE]
							,[DPAGENTRETENTION_PE]
							,[DPAGENTPERCEPTION_PE]
							,[DPEXONERATEDPERCEPTION_PE]
							,[DPOTHERS_PE]
							,[DPEMERGENCYZONE_PE]
							,[DPFINALCONSUMER_PE]
							,[DPNOTDOMICILED_PE]
							,[DPPUBLICSECTOR_PE]
							,[DATAAREAID]  )
						SELECT ex.ACCOUNTNUMBER
							, ex.ACCOUNTNUMBER 
							,ex.[DPTYPEDOCID_PE]
							,ex.[DPNUMBERDOCUMID_PE]
							,ex.[DPAGENTRETENTION_PE]
							,ex.[DPAGENTPERCEPTION_PE]
							,ex.[DPEXONERATEDPERCEPTION_PE]
							,ex.[DPOTHERS_PE]
							,ex.[DPEMERGENCYZONE_PE]
							,ex.[DPFINALCONSUMER_PE]
							,ex.[DPNOTDOMICILED_PE]
							,ex.[DPPUBLICSECTOR_PE]
							,ex.[DATAAREAID]
							from @TVP_CUSTOMERTABLETYPE ex;
					END	

			END	
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
END;
GO



--****** Object:  StoredProcedure [ext].[DPUPDATECODECUSTOMER_PE]    Script Date: 5/21/2019 9:46:34 PM ******
IF OBJECT_ID(N'[ext].[DPUPDATECODECUSTOMER_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPUPDATECODECUSTOMER_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPUPDATECODECUSTOMER_PE].';
END
GO

ALTER PROCEDURE [ext].[DPUPDATECODECUSTOMER_PE]
	@AccountNum								NVARCHAR(38),
    @nvc_DataAreaId                         NVARCHAR(4)
	--@TVP_QUERYRESULTSETTINGS				crt.QUERYRESULTSETTINGSTABLETYPE   READONLY
	
AS
BEGIN

    SET NOCOUNT ON;

    DECLARE @i_ReturnCode                           INT;
    DECLARE @i_TransactionIsOurs                    INT;
    DECLARE @i_Error                                INT;
    DECLARE @dtt_ChangeDateTime                     DATETIME;
    DECLARE @dtt_MaxAxDateTime                      DATETIME;
    DECLARE @nvc_PrimaryEmail                       NVARCHAR(10);
    DECLARE @nvc_CustomerAccountNumber              NVARCHAR(20);

	DECLARE @rows BIGINT;
	DECLARE @CustAccountAsync NVARCHAR(38);

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


	/* Buscando al cliente cuando se ha generado por primera vez me manera OffLine*/
	SELECT @rows = COUNT(T1.CustAccountAsync)  
	FROM ext.DPCUSTTABLE_PE t1 
	WHERE  T1.ACCOUNTNUM = @AccountNum
	   AND T1.DATAAREAID = @nvc_DataAreaId;
	if @rows = 0 
		BEGIN			
			select TOP 1 @CustAccountAsync = t2.CustAccountAsync
			from ax.RETAILCUSTTABLE t2
			where t2.ACCOUNTNUM = @AccountNum
			IF @@ROWCOUNT=1 AND  @CustAccountAsync != ''
			BEGIN
				UPDATE
					T1 
				SET			 
					T1.ACCOUNTNUM = @AccountNum
				FROM
					ext.DPCUSTTABLE_PE AS T1
				WHERE T1.CustAccountAsync = @CustAccountAsync
					AND T1.DATAAREAID = @nvc_DataAreaId
			END
		END


	-- Insertando a los fueron creados en Dynamics y luego enviados al POS
	INSERT INTO ext.DPCUSTTABLE_PE (ACCOUNTNUM, DPTYPEDOCID_PE, DPNUMBERDOCUMID_PE, DPAGENTRETENTION_PE, DPAGENTPERCEPTION_PE, DPEXONERATEDPERCEPTION_PE, DPOTHERS_PE, DPEMERGENCYZONE_PE, 
                         DPFINALCONSUMER_PE, DPNOTDOMICILED_PE, DPPUBLICSECTOR_PE, DATAAREAID)
	SELECT ACCOUNTNUM, DPTYPEDOCID_PE, DPNUMBERDOCUMID_PE, DPAGENTRETENTION_PE, DPAGENTPERCEPTION_PE, DPEXONERATEDPERCEPTION_PE, DPOTHERS_PE, DPEMERGENCYZONE_PE, 
							 DPFINALCONSUMER_PE, DPNOTDOMICILED_PE, DPPUBLICSECTOR_PE, DATAAREAID
	FROM ext.CUSTTABLE T2
	WHERE NOT EXISTS (Select ACCOUNTNUM, DATAAREAID From ext.DPCUSTTABLE_PE T1 
						WHERE T1.ACCOUNTNUM = T2.ACCOUNTNUM AND T1.DATAAREAID = T2.DATAAREAID
							AND T1.ACCOUNTNUM = @AccountNum AND T2.DATAAREAID = @nvc_DataAreaId )
		  AND T2.ACCOUNTNUM = @AccountNum AND T2.DATAAREAID = @nvc_DataAreaId


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
    @nvc_DataAreaId                         NVARCHAR(4)
--	,@MODETYPEMPOS							int	
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
								@nvc_DataAreaId AS 	DATAAREAID) AS source
							--	@MODETYPEMPOS AS MODETYPEMPOS		
				ON (		target.TERMINALID				= source.TERMINALID
						AND target.RECEIPTTRANSTYPE			= source.RECEIPTTRANSTYPE
						AND target.FUNCPROFILEID			= source.FUNCPROFILEID
						AND target.DPOSS_REFDOCUMENTTYPE_PE	= source.DPOSSREFDOCUMENTTYPE
						AND target.DPOSS_DOCUMENTTYPE_PE	= source.DPOSSDOCUMENTTYPEPE
						AND target.DATAAREAID				= source.DATAAREAID)
						--AND target.MODETYPEMPOS				= source.MODETYPEMPOS
				WHEN MATCHED THEN
					   UPDATE SET DATAVALUE		= Source.DataValue
				WHEN NOT MATCHED THEN
					INSERT ( TERMINALID,					RECEIPTTRANSTYPE,							
							 FUNCPROFILEID,					DPOSS_REFDOCUMENTTYPE_PE,		
							 DPOSS_DOCUMENTTYPE_PE,			DATAAREAID,					
							 DATAVALUE,						RecId)
							-- MODETYPEMPOS)
					VALUES ( Source.TERMINALID,				Source.RECEIPTTRANSTYPE,					
							 Source.FUNCPROFILEID,			Source.DPOSSREFDOCUMENTTYPE,	
							 Source.DPOSSDOCUMENTTYPEPE,	Source.DATAAREAID,
							 Source.DataValue,				Source.RecId);
						--	 Source.MODETYPEMPOS);

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


	RETURN @i_ReturnCode;
END;
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


IF OBJECT_ID(N'[ext].[DPUPDATEINSERTRETAILTRANSACTIONTABLE_PE]', N'P') IS NULL
BEGIN
    EXEC ('CREATE PROC [ext].[DPUPDATEINSERTRETAILTRANSACTIONTABLE_PE] AS RAISERROR(''Empty Stored Procedure!!'', 16, 1) WITH SETERROR');
    IF (@@ERROR != 0)
        PRINT N'FAILED to create procedure [ext].[DPUPDATEINSERTRETAILTRANSACTIONTABLE_PE].';
END
GO
ALTER PROCEDURE [ext].[DPUPDATEINSERTRETAILTRANSACTIONTABLE_PE]
    @nvc_DataAreaId                         NVARCHAR(4),
	@Channel								BIGINT,
	@Store									NVARCHAR(10),
	@Terminal								NVARCHAR(10),
	@DPExistPerception						int,
	@DPIDTypeGoodService					NVARCHAR(10),
	@DPPercentage							NUMERIC(32,6),
	@DPCodTypeDocPay						NVARCHAR(10),
	@RECEIPTID								NVARCHAR(18),
	@TransactionId							NVARCHAR(44),
	@DPIdTypeNote_PE						nvarchar(10) = '',
	@DPCodTipoOpeFE_PE						nvarchar(4)  = '',
	@CodTypeDocRel							nvarchar(2)  = '',
	@InvoiceIdRel							nvarchar(20) = '',
	@DateInvoiceRel							Date = '1900-01-01',
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
				MERGE ext.DPRETAILTRANSACTIONTABLE_PE AS target	
				USING (
						SELECT	@Channel AS CHANNEL,
								@Store AS STORE,
								@Terminal AS TERMINAL,
								@DPExistPerception AS DPEXISTPERCEPTION_PE,
								@DPIDTypeGoodService AS DPIDTYPEGOODSERVICE_PE,
								@DPPercentage AS DPPERCENTAGE_PE,
								@DPCodTypeDocPay AS DPCODTYPEDOCPAY_PE,
								@RECEIPTID		AS RECEIPTID,
								@TransactionId AS TRANSACTIONID,
								@DPCodTipoOpeFE_PE AS DPCodTipoOpeFE_PE,
								@nvc_DataAreaId AS 	DATAAREAID ) AS source		
				ON (target.CHANNEL				= source.CHANNEL
					AND target.STORE			= source.STORE
					AND target.TERMINAL			= source.TERMINAL
					AND target.TRANSACTIONID	= source.TRANSACTIONID
					AND target.DATAAREAID		= source.DATAAREAID)
				WHEN MATCHED THEN
					UPDATE SET DPEXISTPERCEPTION_PE		= Source.DPEXISTPERCEPTION_PE,
							   DPIDTYPEGOODSERVICE_PE	= Source.DPIDTYPEGOODSERVICE_PE,
							   DPPERCENTAGE_PE			= Source.DPPERCENTAGE_PE,
							   DPCodTipoOpeFE_PE		= Source.DPCodTipoOpeFE_PE
				WHEN NOT MATCHED THEN
					INSERT ( CHANNEL,						STORE,							
							TERMINAL,						DPEXISTPERCEPTION_PE,			
							DPIDTYPEGOODSERVICE_PE,			DPPERCENTAGE_PE,		
							DPCODTYPEDOCPAY_PE,				RECEIPTID,				
							DPCodTipoOpeFE_PE,					
							TRANSACTIONID,					DATAAREAID)
					VALUES ( Source.CHANNEL,				Source.STORE,					
							Source.TERMINAL,				Source.DPEXISTPERCEPTION_PE,	
							 Source.DPIDTYPEGOODSERVICE_PE,	Source.DPPERCENTAGE_PE,
							 Source.DPCODTYPEDOCPAY_PE,		Source.RECEIPTID,	
							 Source.DPCodTipoOpeFE_PE,			
							 Source.TRANSACTIONID,			Source.DATAAREAID );
		END
ELSE IF @OPCION = 'UPD02'
	BEGIN
						MERGE ext.DPRETAILTRANSACTIONTABLE_PE AS target	
				USING (
						SELECT	@Channel AS CHANNEL,
								@Store AS STORE,
								@Terminal AS TERMINAL,
								@DPExistPerception AS DPEXISTPERCEPTION_PE,
								@DPIDTypeGoodService AS DPIDTYPEGOODSERVICE_PE,
								@DPPercentage AS DPPERCENTAGE_PE,
								@DPCodTypeDocPay AS DPCODTYPEDOCPAY_PE,
								@RECEIPTID		AS RECEIPTID,
								@DPCodTipoOpeFE_PE AS DPCodTipoOpeFE_PE,
								@TransactionId AS TRANSACTIONID,	
								@nvc_DataAreaId AS 	DATAAREAID ) AS source		
				ON (target.CHANNEL				= source.CHANNEL
					AND target.STORE			= source.STORE
					AND target.TERMINAL			= source.TERMINAL
					AND target.TRANSACTIONID	= source.TRANSACTIONID
					AND target.DATAAREAID		= source.DATAAREAID)
				WHEN MATCHED THEN
					UPDATE SET 
							   DPCODTYPEDOCPAY_PE		= source.DPCODTYPEDOCPAY_PE,
							   RECEIPTID				= source.RECEIPTID
				WHEN NOT MATCHED THEN
					INSERT ( CHANNEL,						STORE,							
							TERMINAL,						DPEXISTPERCEPTION_PE,			
							DPIDTYPEGOODSERVICE_PE,			DPPERCENTAGE_PE,		
							DPCODTYPEDOCPAY_PE,				RECEIPTID,	
							DPCodTipoOpeFE_PE,											
							TRANSACTIONID,					DATAAREAID)
					VALUES ( Source.CHANNEL,				Source.STORE,					
							Source.TERMINAL,				Source.DPEXISTPERCEPTION_PE,	
							 Source.DPIDTYPEGOODSERVICE_PE,	Source.DPPERCENTAGE_PE,
							 Source.DPCODTYPEDOCPAY_PE,		Source.RECEIPTID,
							 Source.DPCodTipoOpeFE_PE,		
							 Source.TRANSACTIONID,			Source.DATAAREAID );		
	END
	ELSE IF @OPCION = 'UPD03'
	BEGIN
				MERGE ext.DPRETAILTRANSACTIONTABLE_PE AS target	
				USING (
						SELECT	@Channel AS CHANNEL,
								@Store AS STORE,
								@Terminal AS TERMINAL,
								--@DPExistPerception AS DPEXISTPERCEPTION_PE,
								--@DPIDTypeGoodService AS DPIDTYPEGOODSERVICE_PE,
								--@DPPercentage AS DPPERCENTAGE_PE,
								--@DPCodTypeDocPay AS DPCODTYPEDOCPAY_PE,
								--@RECEIPTID		AS RECEIPTID,
								@TransactionId AS TRANSACTIONID,
								@DPIdTypeNote_PE AS DPIdTypeNote_PE,
								@CodTypeDocRel AS CodTypeDocRel,
								@InvoiceIdRel AS InvoiceIdRel,
								@DateInvoiceRel	AS DateInvoiceRel,	
								@nvc_DataAreaId AS 	DATAAREAID ) AS source		
				ON (target.CHANNEL				= source.CHANNEL
					AND target.STORE			= source.STORE
					AND target.TERMINAL			= source.TERMINAL
					AND target.TRANSACTIONID	= source.TRANSACTIONID
					AND target.DATAAREAID		= source.DATAAREAID)
				WHEN MATCHED THEN
					UPDATE SET 
							   --DPCODTYPEDOCPAY_PE		= source.DPCODTYPEDOCPAY_PE,
							   --RECEIPTID				= source.RECEIPTID,
							   DPIdTypeNote_PE			= Source.DPIdTypeNote_PE,
							   CodTypeDocRel			= Source.CodTypeDocRel,
							   InvoiceIdRel				= Source.InvoiceIdRel,
							   DateInvoiceRel			= Source.DateInvoiceRel
				WHEN NOT MATCHED THEN
					INSERT ( CHANNEL,						STORE,							
							TERMINAL,						--DPEXISTPERCEPTION_PE,			
							--DPIDTYPEGOODSERVICE_PE,			DPPERCENTAGE_PE,		
							--DPCODTYPEDOCPAY_PE,				RECEIPTID,	
							DPIdTypeNote_PE,				CodTypeDocRel,					
							InvoiceIdRel,					DateInvoiceRel,													
							TRANSACTIONID,					DATAAREAID)
					VALUES ( Source.CHANNEL,				Source.STORE,					
							Source.TERMINAL,				--Source.DPEXISTPERCEPTION_PE,	
							 --Source.DPIDTYPEGOODSERVICE_PE,	Source.DPPERCENTAGE_PE,
							 --Source.DPCODTYPEDOCPAY_PE,		Source.RECEIPTID,	
							 Source.DPIdTypeNote_PE,		Source.CodTypeDocRel,
							 Source.InvoiceIdRel,			Source.DateInvoiceRel,
							 Source.TRANSACTIONID,			Source.DATAAREAID );		
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


