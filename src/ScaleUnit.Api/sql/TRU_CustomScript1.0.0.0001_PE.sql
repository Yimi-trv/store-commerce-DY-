-- ext.DPCUSTTABLE_PEVIEW exponia ACCOUNTNUM como
--     CASE WHEN ACCOUNTNUM IS NULL THEN CustAccountAsync ELSE ACCOUNTNUM END
-- y el calculo de impuestos de DP la consulta con ACCOUNTNUM = @ACCOUNTNUM varias veces por
-- escaneo. Filtrar sobre esa expresion impide buscar por la clave primaria de la tabla.
--
-- ACCOUNTNUM no admite nulos, asi que el CASE siempre devuelve ACCOUNTNUM: quitarlo no cambia
-- ningun resultado. Se usa ALTER VIEW para conservar los permisos, y solo si la columna sigue
-- sin admitir nulos en esta base. Los scripts corren una vez por nombre (gotcha #2).
IF OBJECT_ID(N'[ext].[DPCUSTTABLE_PEVIEW]', N'V') IS NOT NULL
    AND COLUMNPROPERTY(OBJECT_ID(N'[ext].[DPCUSTTABLE_PE]'), 'ACCOUNTNUM', 'AllowsNull') = 0
BEGIN
    EXEC (N'ALTER VIEW [ext].[DPCUSTTABLE_PEVIEW]
AS
SELECT        ACCOUNTNUM, DPTYPEDOCID_PE, DPNUMBERDOCUMID_PE, DPAGENTRETENTION_PE, DPAGENTPERCEPTION_PE, DPEXONERATEDPERCEPTION_PE, DPOTHERS_PE, DPEMERGENCYZONE_PE,
                         DPFINALCONSUMER_PE, DPNOTDOMICILED_PE, DPPUBLICSECTOR_PE, DATAAREAID
FROM            ext.DPCUSTTABLE_PE AS ex');
END
GO
