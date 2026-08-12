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
	WHERE  t1.DPISPERCEPTION_PE = 1
	-- WHERE t1.MODULETYPE = 3 AND t1.DPISPERCEPTION_PE = 1
GO


--SET ANSI_NULLS ON
--GO
--SET QUOTED_IDENTIFIER ON
--GO

---- DESARROLLO Cálculo de impuesto selectivo con descuento ISC + DSCTO RETAIL

--IF  EXISTS (SELECT * FROM sys.objects 
--	WHERE object_id = OBJECT_ID(N'[ext].[DPPARAMETERSGENERAL_PE]') AND type in (N'U'))
--BEGIN
--	ALTER TABLE [ext].[DPPARAMETERSGENERAL_PE]
--	ADD [SelectiveTaxWithDiscount] [int] NOT NULL DEFAULT ((0)) 
--END	

--GO