SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

--****** Object:  View [ext].[DPFactorCargoPercep_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPFactorCargoPercep_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPFactorCargoPercep_PEVIEW];
END
GO
CREATE VIEW [ext].[DPFactorCargoPercep_PEVIEW]
AS
	SELECT T4.TaxValue, T1.TRANSACTIONID, T1.DATAAREAID
		FROM CRT.RETAILTRANSACTIONTAXTRANSVIEW T1
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
				AND T1.DATAAREAID = T3.DATAAREAID
				AND T3.DPTaxType_PE = 0 -- PERCEPTION
		INNER JOIN AX.TAXDATA T4 ON T3.TAXCODE = T4.TAXCODE
GO

--****** Object:  View [ext].[DPCodigoTributosItemLine_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTributosItemLine_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTributosItemLine_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTributosItemLine_PEVIEW]
AS
	SELECT T5.IDTYPETAX, T5.DESCRIPTION, T5.CODEINTERNALTIONAL, T5.NAME, T5.NAME2, T1.SALELINENUM, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM CRT.RETAILTRANSACTIONTAXTRANSVIEW T1
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
				AND T3.DATAAREAID = T1.DATAAREAID
				AND T3.DPTaxType_PE = 1 -- IGV  
	INNER JOIN EXT.DPCODETAXTYPES_PE T5 ON T3.DPIdTypeTax_PE = T5.RECID
GO

--****** Object:  View [ext].[DPCodigoTipoAfecIGVFE_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTipoAfecIGVFE_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTipoAfecIGVFE_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTipoAfecIGVFE_PEVIEW]
AS
	SELECT T3.DPCodTypeAfecIGVFE_PE, T1.SALELINENUM, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM CRT.RETAILTRANSACTIONTAXTRANSVIEW T1
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
				AND T3.DATAAREAID = T1.DATAAREAID
				--AND T3.DPTaxType_PE = 1 -- IGV  	
GO

--****** Object:  View [ext].[DPCodigoTipoAfecIGVFEExo_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTipoAfecIGVFEExo_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTipoAfecIGVFEExo_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTipoAfecIGVFEExo_PEVIEW]
AS
	SELECT T3.DPCodTypeAfecIGVFE_PE, T1.LINENUM, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	INNER JOIN AX.TAXONITEM T2 ON T1.TAXITEMGROUP = T2.TAXITEMGROUP 
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE

GO

--****** Object:  View [ext].[DPCodigoTributosItemLineExo_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTributosItemLineExo_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTributosItemLineExo_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTributosItemLineExo_PEVIEW]
AS
	SELECT T5.IDTYPETAX, T5.DESCRIPTION, T5.CODEINTERNALTIONAL, T5.NAME, T5.NAME2, T1.LINENUM, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	INNER JOIN AX.TAXONITEM T2 ON T1.TAXITEMGROUP = T2.TAXITEMGROUP 
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
	--AND T3.DPTaxType_PE = 1 -- IGV
	INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
		AND (T4.IGVClassificationType = 5 -- OpeExo
		  OR T4.IGVClassificationType = 6 )-- OpeInaf
	INNER JOIN EXT.DPCODETAXTYPES_PE T5 ON T3.DPIdTypeTax_PE = T5.RECID
GO

--****** Object:  View [ext].[DPMontoVueltoTransac_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPMontoVueltoTransac_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPMontoVueltoTransac_PEVIEW];
END
GO
CREATE VIEW [ext].[DPMontoVueltoTransac_PEVIEW]
AS
	Select ABS(RTP.AMOUNTCUR) AMOUNTCUR , RTP.TRANSACTIONID, RTP.DATAAREAID
	From ax.RETAILTRANSACTIONPAYMENTTRANS RTP
	WHERE CHANGELINE = 1
GO

--****** Object:  View [ext].[DPMontoOpeAfecIgvItem_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPMontoOpeAfecIgvItem_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPMontoOpeAfecIgvItem_PEVIEW];
END
GO
CREATE VIEW [ext].[DPMontoOpeAfecIgvItem_PEVIEW]
AS
	SELECT ABS(SUM(NETAMOUNT)) NETAMOUNT, T1.LINENUM, T1.TRANSACTIONID, T1.DATAAREAID
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	WHERE EXISTS  (
		select * from AX.TAXONITEM T2 
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
		INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
		--	AND T4.IGVClassificationType = 0 -- TaxedAdquisitionExport
		where T1.TAXITEMGROUP = T2.TAXITEMGROUP 
		AND T3.DPTaxType_PE = 1 -- IGV
		  )
	GROUP BY T1.LINENUM, T1.TRANSACTIONID, T1.DATAAREAID
GO

--****** Object:  View [ext].[DPMontoIGVItem_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPMontoIGVItem_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPMontoIGVItem_PEVIEW];
END
GO
CREATE VIEW [ext].[DPMontoIGVItem_PEVIEW]
AS
	SELECT SUM(T1.TAXAMOUNT) TAXAMOUNT, T1.SALELINENUM, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM CRT.RETAILTRANSACTIONTAXTRANSVIEW T1
	WHERE EXISTS ( SELECT T3.TAXCODE 
					FROM EXT.TAXTABLE T3
						INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
						AND T4.IGVClassificationType = 0 --  TaxedAdquisitionExport	
					WHERE T3.TAXCODE = T1.TAXCODE
						AND T3.DATAAREAID = T1.DATAAREAID
						AND T3.DPTaxType_PE = 1 -- IGV				
	)
	GROUP BY  T1.SALELINENUM, T1.TRANSACTIONID, T1.DATAAREAID  
GO

--****** Object:  View [ext].[DPImpuesIGVLine_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPImpuesIGVLine_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPImpuesIGVLine_PEVIEW];
END
GO
CREATE VIEW [ext].[DPImpuesIGVLine_PEVIEW]
AS
	SELECT SUM(T1.AMOUNT) AMOUNT, T1.SALELINENUM, T1.TRANSACTIONID,  T1.DATAAREAID   
	FROM AX.RETAILTRANSACTIONTAXTRANS T1
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
					AND T1.DATAAREAID = T3.DATAAREAID
					AND T3.DPTaxType_PE = 1 -- IGV
	GROUP BY  T1.TRANSACTIONID,  T1.DATAAREAID, T1.SALELINENUM
GO

--****** Object:  View [ext].[DPCURRENCY_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCURRENCY_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCURRENCY_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCURRENCY_PEVIEW]
AS
	SELECT         CC.CURRENCYCODE, CC.TXT
	FROM            ax.CURRENCY AS CC	 
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTributosEEI_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTributosEEI_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTributosEEI_PEVIEW]
AS
	SELECT T5.IDTYPETAX, T5.DESCRIPTION, T5.CODEINTERNALTIONAL, T5.NAME, T5.NAME2, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	INNER JOIN AX.TAXONITEM T2 ON T1.TAXITEMGROUP = T2.TAXITEMGROUP 
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
--	AND T3.DPTaxType_PE = 1 -- IGV
	INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
		AND (T4.IGVClassificationType = 5 -- OpeExo
		  OR T4.IGVClassificationType = 6 )-- OpeInaf
	INNER JOIN EXT.DPCODETAXTYPES_PE T5 ON T3.DPIdTypeTax_PE = T5.RECID
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPisLineEXO_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPisLineEXO_PEVIEW];
END
GO
CREATE VIEW [ext].[DPisLineEXO_PEVIEW]
AS
	SELECT T1.SALELINENUM, T1.TRANSACTIONID,  T1.DATAAREAID   
	FROM AX.RETAILTRANSACTIONTAXTRANS T1
		WHERE EXISTS  (
			SELECT * FROM EXT.TAXTABLE T3 
			INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
			AND T4.IGVClassificationType = 5 -- EXONERADO
			WHERE T3.TAXCODE = T1.TAXCODE
					AND T1.DATAAREAID = T3.DATAAREAID
				--	AND T3.DPTaxType_PE = 1 -- IGV
				)
	GROUP BY  T1.TRANSACTIONID,  T1.DATAAREAID, T1.SALELINENUM
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPPAYMENTTRANSTYPE_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPPAYMENTTRANSTYPE_PEVIEW];
END
GO
CREATE VIEW [ext].[DPPAYMENTTRANSTYPE_PEVIEW]
AS
	SELECT  T2.NAME, T1.TENDERTYPE, SUM(T1.AMOUNTCUR) AMOUNTCUR, T2.POSOPERATION, T1.TRANSACTIONID,  T1.DATAAREAID, T2.CHANNEL
	FROM ax.RETAILTRANSACTIONPAYMENTTRANS  T1
	INNER JOIN AX.RETAILSTORETENDERTYPETABLE T2
	ON T1.TENDERTYPE = T2.TENDERTYPEID
	AND T1.DATAAREAID = T2.DATAAREAID
	AND T1.CHANNEL = T2.CHANNEL
	AND T1.CHANGELINE = 0
	AND T1.TRANSACTIONSTATUS = 0
	AND T1.VOIDSTATUS = 0
	GROUP BY  T2.NAME, T1.TENDERTYPE, T2.POSOPERATION, T1.TRANSACTIONID,  T1.DATAAREAID, T2.CHANNEL
GO

--****** Object:  View [ext].[DPCodigoTributosEEIEXO_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTributosEEIEXO_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTributosEEIEXO_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTributosEEIEXO_PEVIEW]
AS
	SELECT T5.IDTYPETAX, T5.DESCRIPTION, T5.CODEINTERNALTIONAL, T5.NAME, T5.NAME2, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	INNER JOIN AX.TAXONITEM T2 ON T1.TAXITEMGROUP = T2.TAXITEMGROUP 
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
	--AND T3.DPTaxType_PE = 1 -- IGV
	INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
		AND T4.IGVClassificationType = 5 -- OpeExo
		--  OR T4.IGVClassificationType = 6 )-- OpeInaf
	INNER JOIN EXT.DPCODETAXTYPES_PE T5 ON T3.DPIdTypeTax_PE = T5.RECID
GO

--****** Object:  View [ext].[DPCodigoTributosEEIINA_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTributosEEIINA_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTributosEEIINA_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTributosEEIINA_PEVIEW]
AS
	SELECT T5.IDTYPETAX, T5.DESCRIPTION, T5.CODEINTERNALTIONAL, T5.NAME, T5.NAME2, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	INNER JOIN AX.TAXONITEM T2 ON T1.TAXITEMGROUP = T2.TAXITEMGROUP 
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
	--AND T3.DPTaxType_PE = 1 -- IGV
	INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
		--AND (T4.IGVClassificationType = 5) -- OpeExo
		  AND T4.IGVClassificationType = 6 -- OpeInaf
	INNER JOIN EXT.DPCODETAXTYPES_PE T5 ON T3.DPIdTypeTax_PE = T5.RECID
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPPRODUCTDESCRIPTION_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPPRODUCTDESCRIPTION_PEVIEW];
END
GO
CREATE VIEW [ext].[DPPRODUCTDESCRIPTION_PEVIEW]
AS

	Select  IT.ITEMID, ERPT.NAME, ERPT.DESCRIPTION, IT.DATAAREAID 
	From ax.INVENTTABLE IT
	INNER JOIN ax.EcoResProduct AS ERP ON IT.PRODUCT = ERP.RECID
	INNER JOIN ax.EcoResProductTranslation AS ERPT ON ERP.RECID = ERPT.PRODUCT AND (ERPT.LanguageId = N'es' OR ERPT.LanguageId = N'en-us' OR ERPT.LanguageId = N'es-mx')
	LEFT OUTER JOIN ext.INVENTTABLE AS ITE ON ITE.DATAAREAID = IT.DATAAREAID AND ITE.ITEMID = IT.ITEMID
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPEmpleados_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPEmpleados_PEVIEW];
END
GO
CREATE VIEW [ext].[DPEmpleados_PEVIEW]
AS
	SELECT HCMW.PERSONNELNUMBER, DPT.NAME, DPT.NAMEALIAS
	FROM ax.HCMWORKER HCMW
	INNER JOIN AX.DirPartyTable DPT
	ON DPT.RECID = HCMW.PERSON
GO

--****** Object:  View [ext].[RETAILTRANSACTIONSALESTRANS_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPRETAILTRANSACTIONSALESTRANS_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPRETAILTRANSACTIONSALESTRANS_PEVIEW];
END
GO
CREATE VIEW [ext].[DPRETAILTRANSACTIONSALESTRANS_PEVIEW]
AS
	SELECT      ST.LINENUM, ST.ITEMID, ABS(ST.QTY) AS QTY, ST.PRICE, ABS(ST.NETPRICE) AS NETPRICE, ABS(ST.NETAMOUNT) NETAMOUNT, ABS(ST.NETAMOUNTINCLTAX) NETAMOUNTINCLTAX, ST.UNIT, ERPT.NAME AS NAMEALIAS, ISNULL(ITE.DPCODECUBSO_PE,'') DPCODECUBSO_PE, ISNULL(ITE.DPCODPRODUCTSUNAT_PE,'') DPCODPRODUCTSUNAT_PE, ISNULL(UM.DPIdTypeUniMedComer_PE,'') DPIdTypeUniMedComer_PE, ST.LINEDSCAMOUNT, ST.LINEMANUALDISCOUNTAMOUNT, 
--				ABS(ISNULL(TDISC.AMOUNT,0)) AMOUNTDISC,  ABS(ISNULL(TDISC.DISCOUNTAMOUNT,0)) DISCOUNTAMOUNT, ABS(ISNULL(TDISC.PERCENTAGE,0)) DISCOUNTPERCENTAGE, ABS(ISNULL(TDISC.DISCOUNTCOST,0)) DISCOUNTCOST,
				ST.TRANSACTIONID, ST.DATAAREAID
	FROM       ax.RETAILTRANSACTIONSALESTRANS AS ST 
	LEFT OUTER JOIN EXT.UnitOfMeasure AS UM ON ST.UNIT = UM.SYMBOL
	LEFT OUTER JOIN ax.INVENTTABLE AS IT ON  IT.DATAAREAID = ST.DATAAREAID AND IT.ITEMID = ST.ITEMID 
	INNER JOIN ax.EcoResProduct AS ERP ON IT.PRODUCT = ERP.RECID
	INNER JOIN ax.EcoResProductTranslation AS ERPT ON ERP.RECID = ERPT.PRODUCT AND (ERPT.LanguageId = N'es' OR ERPT.LanguageId = N'en-us')
	LEFT OUTER JOIN ext.INVENTTABLE AS ITE ON ITE.DATAAREAID = ST.DATAAREAID AND ITE.ITEMID = ST.ITEMID
	--LEFT OUTER JOIN AX.RETAILTRANSACTIONDISCOUNTTRANS TDISC
	--ON ST.TRANSACTIONID = TDISC.TRANSACTIONID AND ST.DATAAREAID = TDISC.DATAAREAID AND ST.CHANNEL = TDISC.CHANNEL
	--AND ST.STORE = TDISC.STOREID AND ST.TERMINALID = TDISC.TERMINALID AND ST.LINENUM = TDISC.SALELINENUM
	WHERE ST.TRANSACTIONSTATUS = 0 
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPRetailTransactionDiscountTrans_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPRetailTransactionDiscountTrans_PEVIEW];
END
GO
CREATE VIEW [ext].[DPRetailTransactionDiscountTrans_PEVIEW]
AS
	SELECT   TDISC.SALELINENUM,  ABS(ISNULL(TDISC.AMOUNT,0)) AMOUNTDISC,  ABS(ISNULL(TDISC.DISCOUNTAMOUNT,0)) DISCOUNTAMOUNT, ABS(ISNULL(TDISC.PERCENTAGE,0)) DISCOUNTPERCENTAGE, ABS(ISNULL(TDISC.DISCOUNTCOST,0)) DISCOUNTCOST,
			TDISC.TRANSACTIONID , TDISC.DATAAREAID , TDISC.CHANNEL, TDISC.STOREID, TDISC.TERMINALID 
	FROM  AX.RETAILTRANSACTIONDISCOUNTTRANS TDISC	
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCUSTTABLEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCUSTTABLEVIEW];
END
GO
CREATE VIEW [ext].[DPCUSTTABLEVIEW]
AS
SELECT        ACCOUNTNUM, DPTYPEDOCID_PE, DPNUMBERDOCUMID_PE, DPAGENTRETENTION_PE, DPAGENTPERCEPTION_PE, DPEXONERATEDPERCEPTION_PE, DPOTHERS_PE, DPEMERGENCYZONE_PE, 
                         DPFINALCONSUMER_PE, DPNOTDOMICILED_PE, DPPUBLICSECTOR_PE, DATAAREAID
FROM            ext.DPCUSTTABLE_PE AS ex
UNION ALL
SELECT        ACCOUNTNUM, DPTYPEDOCID_PE, DPNUMBERDOCUMID_PE, DPAGENTRETENTION_PE, DPAGENTPERCEPTION_PE, DPEXONERATEDPERCEPTION_PE, DPOTHERS_PE, DPEMERGENCYZONE_PE, 
                         DPFINALCONSUMER_PE, DPNOTDOMICILED_PE, DPPUBLICSECTOR_PE, DATAAREAID
FROM            ext.CUSTTABLE AS ex
GO

--****** Object:  View [ext].[DPDireccionAlmacen_PEVIEW]    Script Date: 5/21/2019 9:40:08 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPDireccionAlmacen_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPDireccionAlmacen_PEVIEW];
END
GO
CREATE VIEW [ext].[DPDireccionAlmacen_PEVIEW]
AS
	SELECT InventLocation.INVENTLOCATIONID, 
			RTRIM(LTRIM(postalAddress.Street)) +' '+ RTRIM(LTRIM(postalAddress.StreetNumber)) +' '+ 
			--ISNULL(postalAddress.BuildingCompliment,RTRIM(LTRIM(postalAddress.BuildingCompliment)) +' - ')+ 
			ISNULL(CASE RTRIM(LTRIM(postalAddress.BuildingCompliment))  WHEN '' THEN NULL ELSE RTRIM(LTRIM(postalAddress.BuildingCompliment))+'- ' END,'- ')+
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCity.Description,
				(Select DESCRIPTION from ax.LogisticsAddressCity	
				where COUNTRYREGIONID = postalAddress.CountryRegionId
				AND COUNTYID = postalAddress.County
				AND STATEID = postalAddress.State
				AND NAME = postalAddress.City)
				)))) +'-'+  
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCounty.Name,'')))) +'-'+
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressState.Name,'')))) DIRECCION
		FROM ax.LogisticsPostalAddress postalAddress
		INNER JOIN ax.InventLocationLogisticsLocation
			ON InventLocationLogisticsLocation.LOCATION = postalAddress.LOCATION
			AND InventLocationLogisticsLocation.ISPRIMARY = 1
		INNER JOIN ax.InventLocation
		ON InventLocation.RECID = InventLocationLogisticsLocation.INVENTLOCATION
       LEFT outer join ax.LogisticsAddressCity logisticsAddressCity
			ON postalAddress.state = logisticsAddressCity.stateId 
             AND postalAddress.county = logisticsAddressCity.CountyId 
             AND postalAddress.CountryRegionId = logisticsAddressCity.CountryRegionId
			 AND postalAddress.CITY = logisticsAddressCity.NAME
       LEFT outer join ax.LogisticsAddressState logisticsAddressState
            ON postalAddress.state = logisticsAddressState.stateId 
            AND postalAddress.CountryRegionId = logisticsAddressState.CountryRegionId
       LEFT outer join ax.logisticsAddressCounty
            ON postalAddress.state = logisticsAddressCounty.stateId 
             AND postalAddress.county = logisticsAddressCounty.CountyId 
             AND postalAddress.CountryRegionId = logisticsAddressCounty.CountryRegionId
		ORDER BY postalAddress.VALIDTO DESC	 OFFSET 0 ROWS
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPDireccionEmisor_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPDireccionEmisor_PEVIEW];
END
GO
CREATE VIEW [ext].[DPDireccionEmisor_PEVIEW]
AS
			SELECT COMPANYINFO.DataArea, 
			RTRIM(LTRIM(postalAddress.Street)) +' '+ RTRIM(LTRIM(postalAddress.StreetNumber)) +' '+ 
			RTRIM(LTRIM(postalAddress.BuildingCompliment)) +' - '+ 
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCity.Description,
				(Select DESCRIPTION from ax.LogisticsAddressCity	
				where COUNTRYREGIONID = postalAddress.CountryRegionId
				AND COUNTYID = postalAddress.County
				AND STATEID = postalAddress.State
				AND NAME = postalAddress.City)
				)))) +'-'+ 
			UPPER(LTRIM(RTrim(logisticsAddressCounty.Name))) +'-'+
			UPPER(LTRIM(RTrim(logisticsAddressState.Name))) DIRECCION
		FROM ax.LogisticsPostalAddress postalAddress
		INNER JOIN ax.DIRPARTYLOCATION partyLocation
            ON partyLocation.Location = postalAddress.Location
            AND partyLocation.IsPrimary = 1
		INNER JOIN ax.COMPANYINFO  
            on partyLocation.Party = COMPANYINFO.RECID
       LEFT outer join ax.LogisticsAddressCity logisticsAddressCity
            ON postalAddress.CityRecId = logisticsAddressCity.RecId
       LEFT outer join ax.LogisticsAddressState logisticsAddressState
            ON postalAddress.state = logisticsAddressState.stateId 
            AND postalAddress.CountryRegionId = logisticsAddressState.CountryRegionId
       LEFT outer join ax.logisticsAddressCounty
            ON postalAddress.state = logisticsAddressCounty.stateId 
             AND postalAddress.county = logisticsAddressCounty.CountyId 
             AND postalAddress.CountryRegionId = logisticsAddressCounty.CountryRegionId
	 	ORDER BY postalAddress.VALIDTO DESC	 OFFSET 0 ROWS
GO

--****** Object:  View [ext].[DPDatosContactoEmisor_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPDatosContactoEmisor_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPDatosContactoEmisor_PEVIEW];
END
GO
CREATE VIEW [ext].[DPDatosContactoEmisor_PEVIEW]
AS
	SELECT T2.TYPE, T2.LOCATOR, T3.DATAAREA 
	 From  ax.dirPartyLocation T1
	 INNER JOIN ax.LogisticsElectronicAddress T2
            on T2.Location    = T1.Location
			AND T2.ISPRIMARY = 1
	 INNER JOIN AX.COMPANYINFO T3
			ON T1.Party = T3.RECID   
GO

--****** Object:  View [ext].[DPMarkupTable_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPMarkupTable_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPMarkupTable_PEVIEW];
END
GO
CREATE VIEW [ext].[DPMarkupTable_PEVIEW]
AS
	 SELECT T1.MARKUPCODE, T1.DPVALUEPERCEPTION_PE, T1.DPIDCODCHARGEDISCOUNT_PE, T2.TXT, T1.DATAAREAID 
	 From  ext.markupTable T1
	 INNER JOIN ax.MARKUPTABLE T2
		ON T1.MARKUPCODE = T2.MARKUPCODE 
			AND T1.MODULETYPE = T2.MODULETYPE
			AND T1.DATAAREAID = T2.DATAAREAID
	 WHERE t1.MODULETYPE = 3 AND t1.DPISPERCEPTION_PE = 1
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
			UPPER(LTRIM(RTrim(ISNULL(logisticsAddressCity.Description,
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
      ax.LogisticsPostalAddress postalAddress ON partyLocation.Location = postalAddress.Location AND partyLocation.IsPrimary = 1 
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


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTotalValorVtaGravadas_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTotalValorVtaGravadas_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTotalValorVtaGravadas_PEVIEW]
AS
	SELECT SUM(T1.AMOUNT) TAXAMOUNT, T1.TRANSACTIONID, T1.DATAAREAID
	FROM ax.RETAILTRANSACTIONTAXTRANS T1		
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
			AND T1.DATAAREAID = T3.DATAAREAID
			AND T3.DPTaxType_PE = 1 -- IGV
	INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
		AND T4.IGVClassificationType = 0 -- TaxedAdquisitionExport
	INNER  JOIN ax.RETAILTRANSACTIONSALESTRANS T5
			ON T5.TRANSACTIONID = T1.TRANSACTIONID
			AND T5.STORE = T1.STOREID
			AND T5.TERMINALID = T1.TERMINALID
			AND T5.DATAAREAID = T1.DATAAREAID
			AND T5.CHANNEL = T1.CHANNEL
			AND T5.LINENUM =  T1.SALELINENUM 
			AND T5.TRANSACTIONSTATUS = 0
	GROUP BY T1.TRANSACTIONID, T1.DATAAREAID
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPMontoImpuestoPercep_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPMontoImpuestoPercep_PEVIEW];
END
GO
CREATE VIEW [ext].[DPMontoImpuestoPercep_PEVIEW]
AS
	SELECT SUM(T1.AMOUNT) TAXAMOUNT, T1.TRANSACTIONID, T1.DATAAREAID
		FROM ax.RETAILTRANSACTIONTAXTRANS T1
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
				AND T1.DATAAREAID = T3.DATAAREAID
				AND T3.DPTaxType_PE = 0 -- PERCEPTION
		INNER  JOIN ax.RETAILTRANSACTIONSALESTRANS T5
			ON T5.TRANSACTIONID = T1.TRANSACTIONID
			AND T5.STORE = T1.STOREID
			AND T5.TERMINALID = T1.TERMINALID
			AND T5.DATAAREAID = T1.DATAAREAID
			AND T5.CHANNEL = T1.CHANNEL
			AND T5.LINENUM =  T1.SALELINENUM 
			AND T5.TRANSACTIONSTATUS = 0					
	GROUP BY T1.TRANSACTIONID, T1.DATAAREAID
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPNetoLineaConPercep_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPNetoLineaConPercep_PEVIEW];
END
GO
CREATE VIEW [ext].[DPNetoLineaConPercep_PEVIEW]
AS
	SELECT SUM(ABS(T1.NETAMOUNT)) NETAMOUNT, T1.TRANSACTIONID,  T1.DATAAREAID   
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	WHERE EXISTS ( 
				SELECT T4.SALELINENUM 
				FROM AX.RETAILTRANSACTIONTAXTRANS T4
				INNER JOIN EXT.TAXTABLE T5 ON T5.TAXCODE = T4.TAXCODE
					AND T4.DATAAREAID = T5.DATAAREAID
					AND T5.DPTaxType_PE = 0 -- PERCEPTION
				WHERE T1.TRANSACTIONID = T4.TRANSACTIONID
				AND T1.DATAAREAID = T4.DATAAREAID
				AND T1.LINENUM = T4.SALELINENUM
				)
				AND T1.TRANSACTIONSTATUS = 0
	GROUP BY  T1.TRANSACTIONID,  T1.DATAAREAID
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPMontoIGVOnlyPER_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPMontoIGVOnlyPER_PEVIEW];
END
GO
CREATE VIEW [ext].[DPMontoIGVOnlyPER_PEVIEW]
AS
	SELECT SUM(T1.AMOUNT) AMOUNT, T1.TRANSACTIONID,  T1.DATAAREAID   
	FROM AX.RETAILTRANSACTIONTAXTRANS T1
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
					AND T1.DATAAREAID = T3.DATAAREAID
					AND T3.DPTaxType_PE = 1 -- IGV
		INNER JOIN AX.RETAILTRANSACTIONSALESTRANS T6
			ON T6.TRANSACTIONID = T1.TRANSACTIONID
			AND T6.STORE = T1.STOREID
			AND T6.TERMINALID = T1.TERMINALID
			AND T6.DATAAREAID = T1.DATAAREAID
			AND T6.CHANNEL = T1.CHANNEL
			AND T6.LINENUM =  T1.SALELINENUM 
			AND T6.TRANSACTIONSTATUS = 0		
	WHERE EXISTS ( SELECT T4.SALELINENUM 
					FROM AX.RETAILTRANSACTIONTAXTRANS T4
					INNER JOIN EXT.TAXTABLE T5 ON T5.TAXCODE = T4.TAXCODE
					AND T4.DATAAREAID = T5.DATAAREAID
					AND T5.DPTaxType_PE = 0 -- PERCEPTION
				WHERE T1.TRANSACTIONID = T4.TRANSACTIONID
				AND T1.DATAAREAID = T4.DATAAREAID
				AND T1.SALELINENUM = T4.SALELINENUM
				)
	GROUP BY  T1.TRANSACTIONID,  T1.DATAAREAID
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTotalValorVtaIGVGravadas_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTotalValorVtaIGVGravadas_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTotalValorVtaIGVGravadas_PEVIEW]
AS
	SELECT ABS(SUM(NETAMOUNT)) NETAMOUNT, T1.TRANSACTIONID, T1.DATAAREAID
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	WHERE EXISTS  (
		select * from AX.TAXONITEM T2 
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
		INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
			AND T4.IGVClassificationType = 0 -- TaxedAdquisitionExport
		where T1.TAXITEMGROUP = T2.TAXITEMGROUP 
		AND T3.DPTaxType_PE = 1 -- IGV
		  )
		AND T1.TRANSACTIONSTATUS = 0
	GROUP BY T1.TRANSACTIONID, T1.DATAAREAID
GO

/****** Object:  View [ext].[DPDatosRelacTransReturn_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******/
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPDatosRelacTransReturn_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPDatosRelacTransReturn_PEVIEW];
END
GO
CREATE VIEW [ext].[DPDatosRelacTransReturn_PEVIEW]
AS
	Select ISNULL(T2.DPCODTYPEDOCPAY_PE,'') DPCODTYPEDOCPAY_PE , T1.TRANSDATE, T1.RECEIPTID, T1.TERMINAL, T1.CHANNEL, T1.DATAAREAID, T1.STORE, T1.TRANSACTIONID 
	From ax.RETAILTRANSACTIONTABLE T1
	LEFT JOIN ext.DPRETAILTRANSACTIONTABLE_PE T2
	ON T1.TRANSACTIONID = T2.TRANSACTIONID
		AND T1.CHANNEL = T2.CHANNEL
		AND T1.TERMINAL = T2.TERMINAL
		AND T1.STORE = T2.STORE
		AND T1.DATAAREAID = T2.DATAAREAID 
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPBaseAmountChargeCodePerception_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPBaseAmountChargeCodePerception_PEVIEW];
END
GO
CREATE VIEW [ext].[DPBaseAmountChargeCodePerception_PEVIEW]
AS
	SELECT SUM(ABS(T1.NETAMOUNT)) NETAMOUNT, T1.DATAAREAID, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.TRANSACTIONID 
		FROM AX.RETAILTRANSACTIONSALESTRANS T1
		WHERE EXISTS (
			SELECT *
			FROM AX.RETAILTRANSACTIONMARKUPTRANS T2
			INNER JOIN   EXT.MARKUPTABLE T3
			ON T2.MARKUPCODE = T3.MARKUPCODE
				AND T3.MODULETYPE = 3
				AND T2.DATAAREAID = T3.DATAAREAID
				AND T3.DPISPERCEPTION_PE = 1
			WHERE T1.TRANSACTIONID = T2.TRANSACTIONID
				AND	T1.STORE = T2.STORE
				AND T1.CHANNEL = T2.CHANNEL
				AND T1.DATAAREAID = T2.DATAAREAID
				AND T1.TERMINALID = T2.TERMINALID
				AND T2.MODULETYPE = 1
				AND T1.LINENUM = T2.SALELINENUM
		)
		AND T1.TRANSACTIONSTATUS = 0
	GROUP BY  T1.DATAAREAID, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.TRANSACTIONID
GO

--****** Object:  View [ext].[DPExistCodePerception_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPExistCodePerception_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPExistCodePerception_PEVIEW];
END
GO
CREATE VIEW [ext].[DPExistCodePerception_PEVIEW]
AS
	SELECT T1.TAXITEMGROUP, T1.TAXCODE,  T1.DATAAREAID
	FROM AX.TAXONITEM T1
	WHERE EXISTS  (
	SELECT * FROM EXT.TAXTABLE T2 
	WHERE  T2.TAXCODE = T1.TAXCODE
		AND T2.DATAAREAID = T1.DATAAREAID
		AND T2.DPTaxType_PE = 0 -- PERCEPTION
		)
GO



IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTaxAmountChargeCodePerception_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTaxAmountChargeCodePerception_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTaxAmountChargeCodePerception_PEVIEW]
AS
		SELECT SUM(T1.AMOUNT) AMOUNT, T1.DATAAREAID, T1.CHANNEL, T1.STOREID, T1.TERMINALID, T1.TRANSACTIONID 
		FROM AX.RETAILTRANSACTIONTAXTRANS T1
		INNER JOIN EXT.TAXTABLE T4 ON T4.TAXCODE = T1.TAXCODE
					AND T1.DATAAREAID = T4.DATAAREAID
					AND T4.DPTaxType_PE = 1 -- IGV
		INNER JOIN AX.RETAILTRANSACTIONSALESTRANS T6
			ON T6.TRANSACTIONID = T1.TRANSACTIONID
			AND T6.STORE = T1.STOREID
			AND T6.TERMINALID = T1.TERMINALID
			AND T6.DATAAREAID = T1.DATAAREAID
			AND T6.CHANNEL = T1.CHANNEL
			AND T6.LINENUM =  T1.SALELINENUM 
			AND T6.TRANSACTIONSTATUS = 0
		WHERE EXISTS (
			SELECT *
			FROM AX.RETAILTRANSACTIONMARKUPTRANS T2
			INNER JOIN   EXT.MARKUPTABLE T3
			ON T2.MARKUPCODE = T3.MARKUPCODE
				AND T3.MODULETYPE = 3
				AND T2.DATAAREAID = T3.DATAAREAID
				AND T3.DPISPERCEPTION_PE = 1
			WHERE T1.TRANSACTIONID = T2.TRANSACTIONID
				AND	T1.STOREID = T2.STORE
				AND T1.CHANNEL = T2.CHANNEL
				AND T1.DATAAREAID = T2.DATAAREAID
				AND T1.TERMINALID = T2.TERMINALID
				AND T2.MODULETYPE = 1
				AND T1.SALELINENUM = T2.SALELINENUM
		)
	GROUP BY  T1.DATAAREAID, T1.CHANNEL, T1.STOREID, T1.TERMINALID, T1.TRANSACTIONID 
GO

--****** Object:  View [ext].[DPCodigoMotivo_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoMotivo_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoMotivo_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoMotivo_PEVIEW]
AS
  -- se pasa la transacción original
	SELECT ITEMID, LINENUM, ABS(QTY) QTY,  TRANSACTIONID, DATAAREAID 
	FROM ax.RETAILTRANSACTIONSALESTRANS
	WHERE TRANSACTIONSTATUS = 0
	EXCEPT
	SELECT ITEMID, RETURNLINENUM LINENUM, ABS(QTY) QTY, RETURNTRANSACTIONID TRANSACTIONID , DATAAREAID
	FROM ax.RETAILTRANSACTIONSALESTRANS
	WHERE TRANSACTIONSTATUS = 0
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPMontoBaseOtrosImp_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPMontoBaseOtrosImp_PEVIEW];
END
GO
CREATE VIEW [ext].[DPMontoBaseOtrosImp_PEVIEW]
AS

	SELECT SUM(abs(T1.QTY) * T4.TaxValue) AmountBase, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.DATAAREAID, T1.TRANSACTIONID
	From ax.RETAILTRANSACTIONSALESTRANS T1
	INNER JOIN ax.RETAILTRANSACTIONTAXTRANS T2 
	ON T1.TRANSACTIONID = T2.TRANSACTIONID AND T1.LINENUM = T2.SALELINENUM		
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
				AND T2.DATAAREAID = T3.DATAAREAID
				AND T3.DPTaxType_PE = 7 -- ICBPER
		INNER JOIN AX.TAXDATA T4 ON T3.TAXCODE = T4.TAXCODE
	WHERE T1.TRANSACTIONSTATUS = 0
	GROUP BY T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.DATAAREAID, T1.TRANSACTIONID 
GO


/****** Object:  View [ext].[DPNombreTienda_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******/
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPNombreTienda_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPNombreTienda_PEVIEW];
END
GO
CREATE VIEW [ext].[DPNombreTienda_PEVIEW]
AS
	SELECT T4.NAME, T1.RECID ChannelId, T1.STORENUMBER
	FROM ax.RETAILSTORETABLE T1
	INNER JOIN ax.RETAILCHANNELTABLE T2
		ON T1.RECID = T2.RECID
	INNER JOIN ax.OmOperatingUnit T3
		ON T2.OMOperatingUnitID = T3.RecId 
	INNER JOIN ax.DIRPARTYTABLE T4
		ON T3.RECID = T4.RECID
 GO

 
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTotalLineasIGV_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTotalLineasIGV_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTotalLineasIGV_PEVIEW]
AS
	SELECT SUM(ABS(T1.QTY) * ABS(T1.ORIGINALPRICE)) TOTALPRICE, T1.TRANSACTIONID, T1.DATAAREAID
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	WHERE EXISTS  (
		select * from AX.TAXONITEM T2 
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
		INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
			AND T4.IGVClassificationType != 5 -- OpeExo			 
		where T1.TAXITEMGROUP = T2.TAXITEMGROUP 
		AND T3.DPTaxType_PE = 1 -- IGV
		  )	
		AND T1.TRANSACTIONSTATUS = 0
	GROUP BY T1.TRANSACTIONID, T1.DATAAREAID
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPPriceIncludesSalesTAX_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPPriceIncludesSalesTAX_PEVIEW];
END
GO
CREATE VIEW [ext].[DPPriceIncludesSalesTAX_PEVIEW]
AS
	SELECT T2.PRICEINCLUDESSALESTAX, T1.RECID ChannelId, T1.STORENUMBER
	FROM ax.RETAILSTORETABLE T1
	INNER JOIN ax.RETAILCHANNELTABLE T2
		ON T1.RECID = T2.RECID
	INNER JOIN ax.OmOperatingUnit T3
		ON T2.OMOperatingUnitID = T3.RecId 
	INNER JOIN ax.DIRPARTYTABLE T4
		ON T3.RECID = T4.RECID
 GO

 
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTotalPriceVentaLines_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTotalPriceVentaLines_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTotalPriceVentaLines_PEVIEW]
AS
	SELECT SUM(ABS(T1.QTY) * ABS(T1.ORIGINALPRICE)) TOTALPRICE, T1.TRANSACTIONID, T1.DATAAREAID
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	WHERE EXISTS  (
		select * from AX.TAXONITEM T2 
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE	 
		where T1.TAXITEMGROUP = T2.TAXITEMGROUP 
		AND T3.DPTaxType_PE = 1 -- IGV
		  )	
		AND T1.TRANSACTIONSTATUS = 0
	GROUP BY T1.TRANSACTIONID, T1.DATAAREAID
GO

--****** Object:  View [ext].[DPAlmacenTienda_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPAlmacenTienda_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPAlmacenTienda_PEVIEW];
END
GO
CREATE VIEW [ext].[DPAlmacenTienda_PEVIEW]
AS
	SELECT T2.INVENTLOCATION, T1.RECID ChannelId, T1.STORENUMBER
	FROM ax.RETAILSTORETABLE T1
	INNER JOIN ax.RETAILCHANNELTABLE T2
		ON T1.RECID = T2.RECID
	INNER JOIN ax.OmOperatingUnit T3
		ON T2.OMOperatingUnitID = T3.RecId 
	INNER JOIN ax.DIRPARTYTABLE T4
		ON T3.RECID = T4.RECID
 GO

 
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPBaseAmountChargeCodePerceptionDisc_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPBaseAmountChargeCodePerceptionDisc_PEVIEW];
END
GO
CREATE VIEW [ext].[DPBaseAmountChargeCodePerceptionDisc_PEVIEW]
AS
	SELECT SUM(ABS(T1.QTY) * ABS(T1.ORIGINALPRICE)) NETAMOUNT, T1.DATAAREAID, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.TRANSACTIONID 
		FROM AX.RETAILTRANSACTIONSALESTRANS T1
		WHERE EXISTS (
			SELECT *
			FROM AX.RETAILTRANSACTIONMARKUPTRANS T2
			INNER JOIN   EXT.MARKUPTABLE T3
			ON T2.MARKUPCODE = T3.MARKUPCODE
				AND T3.MODULETYPE = 3
				AND T2.DATAAREAID = T3.DATAAREAID
				AND T3.DPISPERCEPTION_PE = 1
			WHERE T1.TRANSACTIONID = T2.TRANSACTIONID
				AND	T1.STORE = T2.STORE
				AND T1.CHANNEL = T2.CHANNEL
				AND T1.DATAAREAID = T2.DATAAREAID
				AND T1.TERMINALID = T2.TERMINALID
				AND T2.MODULETYPE = 1
				AND T1.LINENUM = T2.SALELINENUM
		)
		AND T1.TRANSACTIONSTATUS = 0
	GROUP BY  T1.DATAAREAID, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.TRANSACTIONID
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPNombreDispositivo_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPNombreDispositivo_PEVIEW];
END
GO
CREATE VIEW [ext].[DPNombreDispositivo_PEVIEW]
AS
	SELECT DESCRIPTION, DEVICEID 
	FROM ax.RETAILDEVICE	
 GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTotalValorVtaEEI_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTotalValorVtaEEI_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTotalValorVtaEEI_PEVIEW]
AS
		SELECT ABS(SUM(NETAMOUNT)) NETAMOUNT,ABS(SUM(NETPRICE)) NETPRICE, T1.TRANSACTIONID, T1.DATAAREAID
		FROM AX.RETAILTRANSACTIONSALESTRANS T1
		WHERE EXISTS  (
			select * from AX.TAXONITEM T2 
			INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
			INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
				AND (T4.IGVClassificationType = 5 -- OpeExo
				  OR T4.IGVClassificationType = 6 )-- OpeInaf
			where T1.TAXITEMGROUP = T2.TAXITEMGROUP 
		--	AND T3.DPTaxType_PE = 1 -- IGV
			  )
			  AND T1.TRANSACTIONSTATUS = 0
		GROUP BY T1.TRANSACTIONID, T1.DATAAREAID
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodeEstable_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodeEstable_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodeEstable_PEVIEW]
AS
	SELECT ISNULL(T3.DPCODEESTABLISHMENT_PE,'') DPCODEESTABLISHMENT_PE, T2.INVENTLOCATIONDATAAREAID DATAAREAID, T1.RECID ChannelId, T1.STORENUMBER
	From ax.RETAILSTORETABLE T1
	INNER JOIN ax.RETAILCHANNELTABLE T2
		ON T1.RECID = T2.RECID
	LEFT JOIN ext.INVENTLOCATION T3
		ON T2.INVENTLOCATION = T3.INVENTLOCATIONID
		AND T2.INVENTLOCATIONDATAAREAID = T3.DATAAREAID
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPDiscCostEXO_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPDiscCostEXO_PEVIEW];
END
GO
CREATE VIEW [ext].[DPDiscCostEXO_PEVIEW]
AS
	SELECT SUM(ABS(T2.DISCOUNTCOST)) DISCOUNTCOST, T1.TRANSACTIONID,  T1.DATAAREAID   
	FROM AX.RETAILTRANSACTIONTAXTRANS T1
	INNER JOIN AX.RETAILTRANSACTIONSALESTRANS T6
	ON T6.TRANSACTIONID = T1.TRANSACTIONID
		AND T6.STORE = T1.STOREID
		AND T6.TERMINALID = T1.TERMINALID
		AND T6.DATAAREAID = T1.DATAAREAID
		AND T6.CHANNEL = T1.CHANNEL
		AND T6.LINENUM =  T1.SALELINENUM 
		AND T6.TRANSACTIONSTATUS = 0 
	INNER JOIN AX.RETAILTRANSACTIONDISCOUNTTRANS T2
		ON T1.TRANSACTIONID = T2.TRANSACTIONID 
			AND T1.CHANNEL = T2.CHANNEL
			AND T1.TERMINALID = T2.TERMINALID
			AND T1.DATAAREAID = T2.DATAAREAID
			AND T1.STOREID = T2.STOREID
			AND T1.SALELINENUM = T2.SALELINENUM
		WHERE EXISTS  (
			SELECT * FROM EXT.TAXTABLE T3 
			INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
			AND T4.IGVClassificationType = 5 -- EXONERADO
			WHERE T3.TAXCODE = T1.TAXCODE
					AND T1.DATAAREAID = T3.DATAAREAID
		--			AND T3.DPTaxType_PE = 1 -- IGV
				)
	GROUP BY  T1.TRANSACTIONID,  T1.DATAAREAID
GO



IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPOSS_RetailReceiptMasks_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPOSS_RetailReceiptMasks_PEVIEW];
END
GO
CREATE VIEW [ext].[DPOSS_RetailReceiptMasks_PEVIEW]
AS
	SELECT T1.MASK, T3.DATAVALUE, T1.DPOSS_DOCUMENTTYPE_PE, 
			T1.DPOSS_REFDOCUMENTTYPE_PE, T1.RECEIPTTRANSTYPE, T2.FUNCTIONALITYPROFILE, 
			T2.STORENUMBER, T2.RECID ChannelId, T1.RECID
	FROM ext.DPOSS_RetailReceiptMasks_PE T1
	INNER JOIN ax.RETAILSTORETABLE T2	
	ON T1.FUNCPROFILEID = T2.FUNCTIONALITYPROFILE
	INNER JOIN ext.DPRETAILPOSSEEDDATA_PE T3
	ON T1.RECID = T3.POSSRETAILRECEIPTMASKS
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTotalValorVtaEEIIGVCLASIFEXO_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTotalValorVtaEEIIGVCLASIFEXO_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTotalValorVtaEEIIGVCLASIFEXO_PEVIEW]
AS
	SELECT ABS(SUM(NETAMOUNT)) NETAMOUNT,ABS(SUM(NETPRICE)) NETPRICE, T1.TRANSACTIONID, T1.DATAAREAID
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	WHERE EXISTS  (
		select * from AX.TAXONITEM T2 
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
		INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
			AND (T4.IGVClassificationType = 5) -- OpeExo
			--  OR T4.IGVClassificationType = 6 )-- OpeInaf
		where T1.TAXITEMGROUP = T2.TAXITEMGROUP 
		--AND T3.DPTaxType_PE = 1 -- IGV
		  )
		  AND T1.TRANSACTIONSTATUS = 0
	GROUP BY T1.TRANSACTIONID, T1.DATAAREAID
GO


--****** Object:  View [ext].[DPBankAccountDetrac_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPBankAccountDetrac_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPBankAccountDetrac_PEVIEW];
END
GO
CREATE VIEW [ext].[DPBankAccountDetrac_PEVIEW]
AS
	SELECT ACCOUNTNUM, DATAAREAID
	FROM ext.BankAccountTable
	WHERE DPISACCOUNTDETRACTION_PE = 1
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTotalValorVtaEEIIGVCLASIFINA_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTotalValorVtaEEIIGVCLASIFINA_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTotalValorVtaEEIIGVCLASIFINA_PEVIEW]
AS
	SELECT ABS(SUM(NETAMOUNT)) NETAMOUNT,ABS(SUM(NETPRICE)) NETPRICE, T1.TRANSACTIONID, T1.DATAAREAID
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	WHERE EXISTS  (
		select * from AX.TAXONITEM T2 
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
		INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
			--AND (T4.IGVClassificationType = 5) -- OpeExo
			  AND T4.IGVClassificationType = 6 -- OpeInaf
		where T1.TAXITEMGROUP = T2.TAXITEMGROUP 
		--AND T3.DPTaxType_PE = 1 -- IGV
		  )
		  AND T1.TRANSACTIONSTATUS = 0
	GROUP BY T1.TRANSACTIONID, T1.DATAAREAID
GO

--****** Object:  View [ext].[DPExistCodeTaxPerception_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPExistCodeTaxPerception_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPExistCodeTaxPerception_PEVIEW];
END
GO
CREATE VIEW [ext].[DPExistCodeTaxPerception_PEVIEW]
AS
	SELECT T2.TAXCODE, T2.DATAAREAID
	FROM EXT.TAXTABLE T2 
	WHERE  T2.DPTaxType_PE = 0 -- PERCEPTION
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPDiscCostINA_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPDiscCostINA_PEVIEW];
END
GO
CREATE VIEW [ext].[DPDiscCostINA_PEVIEW]
AS
	SELECT SUM(ABS(T2.DISCOUNTCOST)) DISCOUNTCOST, T1.TRANSACTIONID,  T1.DATAAREAID   
	FROM AX.RETAILTRANSACTIONTAXTRANS T1
	INNER JOIN AX.RETAILTRANSACTIONDISCOUNTTRANS T2
		ON T1.TRANSACTIONID = T2.TRANSACTIONID 
			AND T1.CHANNEL = T2.CHANNEL
			AND T1.TERMINALID = T2.TERMINALID
			AND T1.DATAAREAID = T2.DATAAREAID
			AND T1.STOREID = T2.STOREID
			AND T1.SALELINENUM = T2.SALELINENUM
	INNER JOIN AX.RETAILTRANSACTIONSALESTRANS T6
		ON T6.TRANSACTIONID = T1.TRANSACTIONID
			AND T6.STORE = T1.STOREID
			AND T6.TERMINALID = T1.TERMINALID
			AND T6.DATAAREAID = T1.DATAAREAID
			AND T6.CHANNEL = T1.CHANNEL
			AND T6.LINENUM =  T1.SALELINENUM 
			AND T6.TRANSACTIONSTATUS = 0 
		WHERE EXISTS  (
			SELECT * FROM EXT.TAXTABLE T3 
			INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
			AND T4.IGVClassificationType = 6 -- INAFECTO
			WHERE T3.TAXCODE = T1.TAXCODE
					AND T1.DATAAREAID = T3.DATAAREAID
		--			AND T3.DPTaxType_PE = 1 -- IGV
				)
	GROUP BY  T1.TRANSACTIONID,  T1.DATAAREAID
GO


--****** Object:  View [ext].[DPCUSTTABLE_PEVIEW]    Script Date: 5/21/2019 9:40:08 PM ******

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCUSTTABLE_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCUSTTABLE_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCUSTTABLE_PEVIEW]
AS
SELECT        CASE WHEN ACCOUNTNUM IS NULL THEN CustAccountAsync ELSE ACCOUNTNUM END AS ACCOUNTNUM, DPTYPEDOCID_PE, DPNUMBERDOCUMID_PE, DPAGENTRETENTION_PE, DPAGENTPERCEPTION_PE, DPEXONERATEDPERCEPTION_PE, DPOTHERS_PE, DPEMERGENCYZONE_PE, 
                         DPFINALCONSUMER_PE, DPNOTDOMICILED_PE, DPPUBLICSECTOR_PE, DATAAREAID
FROM            ext.DPCUSTTABLE_PE AS ex
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPAmountChargeCodePerception_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPAmountChargeCodePerception_PEVIEW];
END
GO
CREATE VIEW [ext].[DPAmountChargeCodePerception_PEVIEW]
AS
		SELECT SUM(T1.CALCULATEDAMOUNT) CALCULATEDAMOUNT, T1.DATAAREAID, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.TRANSACTIONID
		FROM AX.RETAILTRANSACTIONMARKUPTRANS T1
		INNER JOIN AX.RETAILTRANSACTIONSALESTRANS T6
			ON T6.TRANSACTIONID = T1.TRANSACTIONID
			AND T6.STORE = T1.STORE
			AND T6.TERMINALID = T1.TERMINALID
			AND T6.DATAAREAID = T1.DATAAREAID
			AND T6.CHANNEL = T1.CHANNEL
			AND T6.LINENUM =  T1.SALELINENUM 			
		 WHERE EXISTS (
				SELECT * FROM
					EXT.MARKUPTABLE T2
				WHERE
						T1.MARKUPCODE = T2.MARKUPCODE
					AND T2.MODULETYPE = 3
					AND T1.DATAAREAID = T2.DATAAREAID
					AND T2.DPISPERCEPTION_PE = 1
			)
		AND T1.MODULETYPE = 1
		AND T6.TRANSACTIONSTATUS = 0	
		GROUP BY T1.DATAAREAID, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.TRANSACTIONID
GO


--****** Object:  View [ext].[DPInventTableGoodsPER_PEVIEW]    Script Date: 5/21/2019 9:40:08 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPInventTableGoodsPER_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPInventTableGoodsPER_PEVIEW];
END
GO
CREATE VIEW [ext].[DPInventTableGoodsPER_PEVIEW]
AS
	SELECT        T2.MINVALUE, T1.ITEMID, T2.APLYQTY, T1.DATAAREAID
	FROM          ext.INVENTTABLE AS T1
	INNER JOIN    ext.DPGOODSPERCEPTIONIGV_PE T2
	ON	T1.DPGOODSPERCEPTION_PE = T2.IDGOODS
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPisChargeCodePerception_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPisChargeCodePerception_PEVIEW];
END
GO
CREATE VIEW [ext].[DPisChargeCodePerception_PEVIEW]
AS
		SELECT T1.MARKUPCODE, T1.DATAAREAID, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.TRANSACTIONID
		FROM AX.RETAILTRANSACTIONMARKUPTRANS T1
		INNER JOIN AX.RETAILTRANSACTIONSALESTRANS T6
			ON T6.TRANSACTIONID = T1.TRANSACTIONID
			AND T6.STORE = T1.STORE
			AND T6.TERMINALID = T1.TERMINALID
			AND T6.DATAAREAID = T1.DATAAREAID
			AND T6.CHANNEL = T1.CHANNEL
			AND T6.LINENUM =  T1.SALELINENUM 	
		 WHERE EXISTS (
				SELECT * FROM
					EXT.MARKUPTABLE T2
				WHERE
						T1.MARKUPCODE = T2.MARKUPCODE
					AND T2.MODULETYPE = 3
					AND T1.DATAAREAID = T2.DATAAREAID
					AND T2.DPISPERCEPTION_PE = 1
			)
		AND T1.MODULETYPE = 1
		AND T6.TRANSACTIONSTATUS = 0	
GO


--****** Object:  View [ext].[DPInventTableModule_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPInventTableModule_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPInventTableModule_PEVIEW];
END
GO
CREATE VIEW [ext].[DPInventTableModule_PEVIEW]
AS
	SELECT TAXITEMGROUPID, ITEMID, DATAAREAID
	FROM ax.INVENTTABLEMODULE
	WHERE MODULETYPE = 2 -- 'Ventas		
GO


IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPValueChargeCodePerception_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPValueChargeCodePerception_PEVIEW];
END
GO
CREATE VIEW [ext].[DPValueChargeCodePerception_PEVIEW]
AS
		SELECT T1.VALUE, T1.DATAAREAID, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.TRANSACTIONID
		FROM AX.RETAILTRANSACTIONMARKUPTRANS T1
		INNER JOIN AX.RETAILTRANSACTIONSALESTRANS T6
			ON T6.TRANSACTIONID = T1.TRANSACTIONID
			AND T6.STORE = T1.STORE
			AND T6.TERMINALID = T1.TERMINALID
			AND T6.DATAAREAID = T1.DATAAREAID
			AND T6.CHANNEL = T1.CHANNEL
			AND T6.LINENUM =  T1.SALELINENUM 	
		 WHERE EXISTS (
				SELECT * FROM
					EXT.MARKUPTABLE T2
				WHERE
						T1.MARKUPCODE = T2.MARKUPCODE
					AND T2.MODULETYPE = 3
					AND T1.DATAAREAID = T2.DATAAREAID
					AND T2.DPISPERCEPTION_PE = 1
			)
		AND T1.MODULETYPE = 1
		AND T6.TRANSACTIONSTATUS = 0
GO


--****** Object:  View [ext].[DPTypeGoodServAfecDetrac_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTypeGoodServAfecDetrac_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTypeGoodServAfecDetrac_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTypeGoodServAfecDetrac_PEVIEW]
AS
	SELECT IDTYPEGOODSERVICE, DESCRIPTION, PERCENTAGE, MINAMOUNT, TYPEANNEXESDETRACTION, DATAAREAID 
	FROM ext.DPTypeGoodServAfecDetrac_PE	
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
GO


--****** Object:  View [ext].[DPCodeTypeGoodService_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodeTypeGoodService_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodeTypeGoodService_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodeTypeGoodService_PEVIEW]
AS
	SELECT DPIDTYPEGOODSERVICE_PE, ITEMID,  DATAAREAID
	FROM ext.INVENTTABLE	
GO

IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPRetailTransactionSalesTransHeader_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPRetailTransactionSalesTransHeader_PEVIEW];
END
GO
CREATE VIEW [ext].[DPRetailTransactionSalesTransHeader_PEVIEW]
AS
	SELECT T1.LINENUM, T1.TAXGROUP, T1.TAXITEMGROUP, T1.NETPRICE, T1.NETAMOUNT, T1.NETAMOUNTINCLTAX,
		   T1.QTY, T1.TAXAMOUNT, T1.TOTALDISCAMOUNT, T1.PRICE,
		   T1.TERMINALID, T1.STORE, T1.CHANNEL, T1.TRANSACTIONID, T1.DATAAREAID
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	WHERE T1.TRANSACTIONSTATUS = 0 	
GO


--****** Object:  View [ext].[DPCodeTypeGoodServiceAnexo_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodeTypeGoodServiceAnexo_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodeTypeGoodServiceAnexo_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodeTypeGoodServiceAnexo_PEVIEW]
AS
	SELECT T2.TYPEANNEXESDETRACTION, T1.ITEMID,  T1.DATAAREAID
	FROM ext.INVENTTABLE T1
	INNER JOIN ext.DPTypeGoodServAfecDetrac_PE T2
	ON T1.DPIDTYPEGOODSERVICE_PE = T2.IDTYPEGOODSERVICE
		AND T1.DATAAREAID = T2.DATAAREAID
GO

--****** Object:  View [ext].[DPRETAILTAXTRANSTYPE_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPRETAILTAXTRANSTYPE_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPRETAILTAXTRANSTYPE_PEVIEW];
END
GO
CREATE VIEW [ext].[DPRETAILTAXTRANSTYPE_PEVIEW]
AS
	SELECT  TTrans.SALELINENUM, TTrans.TAXAMOUNT, TTrans.TAXCODE, TTrans.TAXBASIS, TTrans.TRANSACTIONID, TTrans.TERMINALID,
			TTrans.STOREID, TTrans.DATAAREAID, 
			TTable.DPTAXTYPE_PE TAXTYPE,
			ISNULL(TIGVCLAS.IGVCLASSIFICATIONTYPE,-1) IGVCLASSIFICATIONTYPE -- -1 valor Nulo
			,ISNULL(TaxData.TAXVALUE,0) TAXVALUE
			, ISNULL(TTaxType.IDTYPETAX,'') IDTYPETAX
	FROM crt.RETAILTRANSACTIONTAXTRANSVIEW TTrans
	INNER JOIN ext.TAXTABLE TTable
	ON TTrans.DATAAREAID = TTable.DATAAREAID
		AND TTrans.TAXCODE = TTable.TAXCODE
	LEFT JOIN ext.DPIGVCLASSIFICATION_PE AS TIGVCLAS 
	ON TTable.DPIGVCLASSIFICATION_PE = TIGVCLAS.RECID
	LEFT JOIN ax.TAXDATA TaxData ON TTable.TAXCODE = TaxData.TAXCODE
	AND TTable.DATAAREAID = TaxData.DATAAREAID 
	LEFT OUTER JOIN 
	ext.DPCODETAXTYPES_PE AS TTaxType ON TTable.DPIDTYPETAX_PE = TTaxType.RECID
GO


--****** Object:  View [ext].[DPRETAILTRANSACTIONTABLE_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPRETAILTRANSACTIONTABLE_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPRETAILTRANSACTIONTABLE_PEVIEW];
END
GO
CREATE VIEW [ext].[DPRETAILTRANSACTIONTABLE_PEVIEW]
AS
	SELECT DPIDTYPEGOODSERVICE_PE, DPPERCENTAGE_PE, DPEXISTPERCEPTION_PE, TRANSACTIONID, DATAAREAID
	FROM ext.DPRETAILTRANSACTIONTABLE_PE
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
			T1.TERMINALID, T1.DATAAREAID
			--, T1.MODETYPEMPOS
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
		--AND T1.MODETYPEMPOS = T3.MODETYPEMPOS
GO

--****** Object:  View [ext].[DPCodigoTributosGratuitas_PEVIEW]    Script Date: 10/30/2020 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTributosGratuitas_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTributosGratuitas_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTributosGratuitas_PEVIEW]
AS
	SELECT T5.IDTYPETAX, T5.DESCRIPTION, T5.CODEINTERNALTIONAL, T5.NAME, T5.NAME2, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM CRT.RETAILTRANSACTIONTAXTRANSVIEW T1
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
				AND T3.DATAAREAID = T1.DATAAREAID
				AND T3.DPTaxType_PE = 1 -- IGV
	INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
		--AND T4.IGVClassificationType = 0 --  TaxedAdquisitionExport		  
	INNER JOIN EXT.DPCODETAXTYPES_PE T5 ON T3.DPIdTypeTax_PE = T5.RECID
		AND T5.IDTYPETAX = '9996' -- //Transferencia Gratuita
GO

--****** Object:  View [ext].[DPTAXTRANSPERCEPTION_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTAXTRANSPERCEPTION_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTAXTRANSPERCEPTION_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTAXTRANSPERCEPTION_PEVIEW]
AS
SELECT T1.TAXCODE, T1.TRANSACTIONID, T1.DATAAREAID
FROM CRT.RETAILTRANSACTIONTAXTRANSVIEW T1
WHERE EXISTS ( 
		SELECT T3.TAXCODE 
		FROM EXT.TAXTABLE T3
		WHERE T3.TAXCODE = T1.TAXCODE
			AND T3.DATAAREAID = T1.DATAAREAID
			AND T3.DPTaxType_PE = 0 -- PERCEPCION							
	)
GO


--****** Object:  View [ext].[DPCodigoTributosGravadas_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTAXITEMGROUPISC_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTAXITEMGROUPISC_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTAXITEMGROUPISC_PEVIEW]
AS
	SELECT T1.TAXCODE, T1.TAXITEMGROUP, T1.DATAAREAID 
	FROM AX.TAXONITEM T1
	INNER JOIN EXT.TAXTABLE T2 
		ON T1.DATAAREAID = T2.DATAAREAID
		AND T1.TAXCODE = T2.TAXCODE
	WHERE T2.DPTAXTYPE_PE = 2 --ISC
GO

--****** Object:  View [ext].[DPCodigoTributosGravadas_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTributosGravadas_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTributosGravadas_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTributosGravadas_PEVIEW]
AS
	SELECT T5.IDTYPETAX, T5.DESCRIPTION, T5.CODEINTERNALTIONAL, T5.NAME, T5.NAME2, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM CRT.RETAILTRANSACTIONTAXTRANSVIEW T1
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
				AND T3.DATAAREAID = T1.DATAAREAID
				AND T3.DPTaxType_PE = 1 -- IGV
	INNER JOIN EXT.DPIGVClassification_PE T4 ON T3.DPIGVClassification_PE = T4.RECID
		AND T4.IGVClassificationType = 0 --  TaxedAdquisitionExport		  
	INNER JOIN EXT.DPCODETAXTYPES_PE T5 ON T3.DPIdTypeTax_PE = T5.RECID
		AND T5.IDTYPETAX = '1000' -- //IGV
GO


--****** Object:  View [ext].[DPPERCODECHARGEDISCOUNT_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPPERCODECHARGEDISCOUNT_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPPERCODECHARGEDISCOUNT_PEVIEW];
END
GO
CREATE VIEW [ext].[DPPERCODECHARGEDISCOUNT_PEVIEW]
AS
SELECT T3.DPIDCODCHARGEDISCOUNT_PE, T1.TRANSACTIONID, T1.DATAAREAID
FROM CRT.RETAILTRANSACTIONTAXTRANSVIEW T1
INNER JOIN EXT.TAXTABLE T3
ON T3.TAXCODE = T1.TAXCODE
	AND T3.DATAAREAID = T1.DATAAREAID
	AND T3.DPTaxType_PE = 0 -- PERCEPCION	
GO


--****** Object:  View [ext].[DPPERCODECHARGEDISCOUNT_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCODECHARGEDISCOUNTPERCEPTION_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCODECHARGEDISCOUNTPERCEPTION_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCODECHARGEDISCOUNTPERCEPTION_PEVIEW]
AS
	SELECT  T2.DPIDCODCHARGEDISCOUNT_PE, T1.DATAAREAID, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.TRANSACTIONID
	FROM AX.RETAILTRANSACTIONMARKUPTRANS T1
	INNER JOIN EXT.MARKUPTABLE T2
			ON
					T1.MARKUPCODE = T2.MARKUPCODE
				AND T2.MODULETYPE = 3
				AND T1.DATAAREAID = T2.DATAAREAID
				AND T2.DPISPERCEPTION_PE = 1
	WHERE  T1.MODULETYPE = 1	
GO


--****** Object:  View [ext].[DPPRINTERDEVICENAME_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPPRINTERDEVICENAME_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPPRINTERDEVICENAME_PEVIEW];
END
GO
CREATE VIEW [ext].[DPPRINTERDEVICENAME_PEVIEW]
AS
	SELECT T1.TERMINALID, T3.STORENUMBER, T2.PRINTERDEVICENAME
	FROM ax.RETAILTERMINALTABLE T1
	INNER JOIN ax.RETAILHARDWAREPROFILE T2
	ON T1.HARDWAREPROFILE = T2.PROFILEID
	INNER JOIN ax.RETAILSTORETABLE T3
	ON T3.RECID = T1.STORERECID 	
GO

--****** Object:  View [ext].[DPCodigoTributosOtrosImp_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTributosOtrosImp_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTributosOtrosImp_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTributosOtrosImp_PEVIEW]
AS
	SELECT T5.IDTYPETAX, T5.DESCRIPTION, T5.CODEINTERNALTIONAL, T5.NAME, T5.NAME2, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM AX.RETAILTRANSACTIONSALESTRANS T1
	INNER JOIN AX.TAXONITEM T2 ON T1.TAXITEMGROUP = T2.TAXITEMGROUP 
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
	AND T3.DPTaxType_PE = 7 -- ICBPER
	INNER JOIN EXT.DPCODETAXTYPES_PE T5 ON T3.DPIdTypeTax_PE = T5.RECID
GO


--****** Object:  View [ext].[DPCodigoTributosOtrosImpLine_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPCodigoTributosOtrosImpLine_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPCodigoTributosOtrosImpLine_PEVIEW];
END
GO
CREATE VIEW [ext].[DPCodigoTributosOtrosImpLine_PEVIEW]
AS
	SELECT T5.IDTYPETAX, T5.DESCRIPTION, T5.CODEINTERNALTIONAL, T5.NAME, T5.NAME2, T1.SALELINENUM, T1.TRANSACTIONID, T1.DATAAREAID  
	FROM CRT.RETAILTRANSACTIONTAXTRANSVIEW T1
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
				AND T3.DATAAREAID = T1.DATAAREAID
				AND T3.DPTaxType_PE = 7 -- ICBPER  
	INNER JOIN EXT.DPCODETAXTYPES_PE T5 ON T3.DPIdTypeTax_PE = T5.RECID
GO

--****** Object:  View [ext].[DPTAXITEMGROUPISC_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTAXITEMGROUPISC_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTAXITEMGROUPISC_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTAXITEMGROUPISC_PEVIEW]
AS
	SELECT T1.TAXCODE, T1.TAXITEMGROUP, T1.DATAAREAID 
	FROM AX.TAXONITEM T1
	INNER JOIN EXT.TAXTABLE T2 
		ON T1.DATAAREAID = T2.DATAAREAID
		AND T1.TAXCODE = T2.TAXCODE
	WHERE T2.DPTAXTYPE_PE = 2 --ISC

GO

--****** Object:  View [ext].[DPPorcentajeImpuestoOtrosImpLine_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPPorcentajeImpuestoOtrosImpLine_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPPorcentajeImpuestoOtrosImpLine_PEVIEW];
END
GO
CREATE VIEW [ext].[DPPorcentajeImpuestoOtrosImpLine_PEVIEW]
AS

	SELECT T4.TaxValue, T1.LINENUM, T1.CHANNEL, T1.STORE, T1.TERMINALID, T1.DATAAREAID, T1.TRANSACTIONID
	From ax.RETAILTRANSACTIONSALESTRANS T1
	INNER JOIN ax.RETAILTRANSACTIONTAXTRANS T2 
	ON T1.TRANSACTIONID = T2.TRANSACTIONID AND T1.LINENUM = T2.SALELINENUM
	INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T2.TAXCODE
				AND T2.DATAAREAID = T3.DATAAREAID
				AND T3.DPTaxType_PE = 7 -- ICBPER
		INNER JOIN AX.TAXDATA T4 ON T3.TAXCODE = T4.TAXCODE
GO

--****** Object:  View [ext].[DPPorcentajeImpuestoItem_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPPorcentajeImpuestoItem_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPPorcentajeImpuestoItem_PEVIEW];
END
GO
CREATE VIEW [ext].[DPPorcentajeImpuestoItem_PEVIEW]
AS
	SELECT T4.TaxValue,  T1.TAXCODE, T1.SALELINENUM, T1.TRANSACTIONID, T1.DATAAREAID
		FROM CRT.RETAILTRANSACTIONTAXTRANSVIEW T1
		INNER JOIN EXT.TAXTABLE T3 ON T3.TAXCODE = T1.TAXCODE
				AND T1.DATAAREAID = T3.DATAAREAID
				AND T3.DPTaxType_PE = 1 -- IGV
		INNER JOIN AX.TAXDATA T4 ON T3.TAXCODE = T4.TAXCODE
GO

--****** Object:  View [ext].[DPTYPEDOCUMIDENT_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTYPEDOCUMIDENT_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTYPEDOCUMIDENT_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTYPEDOCUMIDENT_PEVIEW]
AS
SELECT        RECID, TYPEDOCID, DESCRIPTION, DATAAREAID
FROM            ext.DPTYPEDOCUMIDENT_PE AS dptd
GO

--****** Object:  View [ext].[DPTransaccionRetorno_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPTransaccionRetorno_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPTransaccionRetorno_PEVIEW];
END
GO
CREATE VIEW [ext].[DPTransaccionRetorno_PEVIEW]
AS
	--SELECT ITEMID, ABS(QTY) QTY, PRICE, RETURNTRANSACTIONID TRANSACTIONID , DATAAREAID
	SELECT ITEMID, ABS(QTY) QTY, PRICE, TRANSACTIONID , DATAAREAID
	FROM ax.RETAILTRANSACTIONSALESTRANS
	WHERE TRANSACTIONSTATUS = 0
GO

--****** Object:  View [ext].[DPINVENTLOCATION_PEVIEW]    Script Date: 5/21/2019 9:41:35 PM ******
IF EXISTS (SELECT * FROM sys.views t1 inner join SYS.schemas t2 on  t1.schema_id = t2.schema_id and t2.name = 'EXT' 
			WHERE T1.name = 'DPINVENTLOCATION_PEVIEW' AND T1.type = 'V' ) 
BEGIN
	DROP VIEW [ext].[DPINVENTLOCATION_PEVIEW];
END
GO
CREATE VIEW [ext].[DPINVENTLOCATION_PEVIEW]
AS
SELECT T1.DPCodeEstablishment_PE,T2.INVENTDIMID, T1.DATAAREAID
FROM EXT.INVENTLOCATION T1
INNER JOIN AX.INVENTDIM T2
	ON T1.INVENTLOCATIONID = T2.INVENTLOCATIONID
	AND T1.DATAAREAID = T2.DATAAREAID

GO