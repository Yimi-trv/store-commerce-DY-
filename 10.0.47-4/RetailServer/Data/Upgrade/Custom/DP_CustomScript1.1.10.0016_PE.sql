--SET ANSI_NULLS ON
--GO
--SET QUOTED_IDENTIFIER ON
--GO

---- DESARROLLO Control de Clientes repetidos por Ndoc DE HQ A RETAIL

--IF  EXISTS (SELECT * FROM sys.objects 
--	WHERE object_id = OBJECT_ID(N'[ext].[DPPARAMETERSGENERAL_PE]') AND type in (N'U'))
--BEGIN
--	ALTER TABLE [ext].[DPPARAMETERSGENERAL_PE]
--	ADD [CustValidNumDoc] [int] NOT NULL DEFAULT ((0)) 
--END	

--GO