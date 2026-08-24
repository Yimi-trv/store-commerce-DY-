/**
 * SCT_ThemeAssets — íconos y CSS del tema "Trujillo Market" para Store Commerce.
 * Soporte dual: 1920x855 (sct-amplio) y 1024x768 (sct-compacto).
 *
 * ---------------------------------------------------------------------------------------------
 * COMO ESTA ORGANIZADO ESTE FICHERO (leer antes de tocar nada)
 * ---------------------------------------------------------------------------------------------
 *
 * Al final, construirCss() devuelve TRES bloques concatenados:
 *
 *     acotar(cssBase)                                    -> siempre
 *     @media (min-width:1367px) { acotar(cssAmplio)   }  -> pantalla ancha
 *     @media (max-width:1366px) { acotar(cssCompacto) }  -> 1024x768 y similares
 *
 * acotar() reescribe CADA selector para colgarlo de "body.sct-on", que es la clase que el motor
 * pone SOLO en la pantalla de transaccion. Asi el tema no se derrama sobre las pantallas de SUNAT
 * ni sobre el resto del POS.
 *
 * TRAMPA DE acotar(): trocea el CSS partiendo por "}" y por "{". Ningun valor puede contener esas
 * llaves (ojo con los data: URI de los iconos y con content:''), o el troceado se rompe.
 *
 * TRAMPA DE ".dark": es una clase del PROPIO <body>, no de un ancestro. Por eso acotar() la fusiona
 * en un selector compuesto (body.sct-on.dark ...). Si se escribe a mano "body.sct-on .dark" la
 * regla no casa NUNCA y parece aplicada sin estarlo.
 *
 * REGLA DE ORO DEL LAYOUT DUAL: toda regla de GEOMETRIA (width, height, left, top, position,
 * display, overflow) que se anada a cssAmplio necesita su equivalente en cssCompacto. La mayoria
 * de los bugs de 1024x768 de esta campana fueron exactamente eso: reglas que nunca se replicaron.
 *
 * LIMITE REAL DEL CSS: el POS escribe estilos INLINE con !important en algunos botones (el color
 * de los botones de cuadricula viene configurado en HQ). Un !important de hoja de estilos NO gana
 * a un inline con !important: esas reglas quedan como codigo muerto. Comprobado en el panel
 * BOLETEO, que se ve #FF0000 pese a que aqui se pide #1B1A19. Si hay que cambiarlo, se cambia en
 * HQ o desde el motor con setProperty(..., 'important').
 *
 * El umbral 1366/1367 de estas @media tiene que coincidir con esCompacto() de ThemeEngine.ts.
 */

export var TEMA_ACTIVO: boolean = true;
export var CLASE_AMBITO: string = "sct-on";
export var CLASE_AMPLIO: string = "sct-amplio";
export var CLASE_COMPACTO: string = "sct-compacto";

var ROJO: string = "#C8102E";
var ROJO_CALIDO: string = "#E8442C";
var FONDO_TARJETA: string = "rgba(22,21,20,0.6)";
var BORDE_TARJETA: string = "1px solid rgba(255,255,255,0.12)";

function acotar(css: string, raiz: string): string {
    var salida: string = "";
    var bloques: string[] = css.split("}");
    for (var i: number = 0; i < bloques.length; i++) {
        var bloque: string = bloques[i];
        var corte: number = bloque.indexOf("{");
        if (corte < 0) continue;
        var selectores: string[] = bloque.substring(0, corte).split(",");
        var cuerpo: string = bloque.substring(corte);
        var acotados: string[] = [];
        for (var j: number = 0; j < selectores.length; j++) {
            var selector: string = selectores[j].replace(/^\s+|\s+$/g, "");
            if (selector.length === 0) continue;
            if (selector.indexOf(".dark ") === 0) {
                acotados.push(raiz + ".dark " + selector.substring(6));
            } else {
                acotados.push(raiz + " " + selector);
            }
        }
        if (acotados.length > 0) {
            salida += acotados.join(",") + cuerpo + "}\n";
        }
    }
    return salida;
}

function svg(body: string, strokeWidth: string): string {
    var head: string = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='" + strokeWidth + "' stroke-linecap='round' stroke-linejoin='round'>";
    return "url(\"data:image/svg+xml," + encodeURIComponent(head + body + "</svg>") + "\")";
}

function aspaRoja(cx: number, cy: number): string {
    return "<circle cx='" + cx + "' cy='" + cy + "' r='4.6' stroke='" + ROJO_CALIDO + "'/><path d='M" + (cx - 1.7) + " " + (cy - 1.7) + "l3.4 3.4M" + (cx + 1.7) + " " + (cy - 1.7) + "l-3.4 3.4' stroke='" + ROJO_CALIDO + "'/>";
}

var RECIBO: string = "<path d='M3.5 2.5h11v15l-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2-1.8-1.2-2 1.2z'/><path d='M6 6.5h6M6 9.5h4.5M6 12.5h3.5'/>";

export var ICONOS: { [clave: string]: string } = {
    tab0: svg("<rect x='6.5' y='2.5' width='11' height='19' rx='2.6'/><circle cx='9.5' cy='7.5' r='1.05' fill='white' stroke='none'/><circle cx='14.5' cy='7.5' r='1.05' fill='white' stroke='none'/><circle cx='9.5' cy='12' r='1.05' fill='white' stroke='none'/><circle cx='14.5' cy='12' r='1.05' fill='white' stroke='none'/><circle cx='9.5' cy='16.5' r='1.05' fill='white' stroke='none'/><circle cx='14.5' cy='16.5' r='1.05' fill='white' stroke='none'/>", "1.5"),
    tab1: svg("<circle cx='12' cy='8.2' r='3.5'/><path d='M4.8 20c0-3.7 3.1-6 7.2-6s7.2 2.3 7.2 6'/>", "1.5"),
    tab2: svg("<path d='M1.8 4h2.5l2.9 10.2h9.9l2.4-7.7H7.2'/><circle cx='9.6' cy='19' r='1.5'/><circle cx='16.6' cy='19' r='1.5'/>", "1.5"),
    tab3: svg("<path d='M3 7.5h18v3.2a1.9 1.9 0 000 3.6v3.2H3v-3.2a1.9 1.9 0 000-3.6z'/>", "1.5"),
    c1: svg("<circle cx='9' cy='8' r='3.4'/><path d='M2.5 19.5c0-3.4 2.9-5.5 6.5-5.5s6.5 2.1 6.5 5.5'/><path d='M19 7.5v6M16 10.5h6'/>", "1.4"),
    c2: svg("<circle cx='9' cy='8' r='3.4'/><path d='M2.5 19.5c0-3.4 2.9-5.5 6.5-5.5 1 0 2 .2 2.9.5'/><path d='M21 11l-6.5 6.5-3 .8.8-3L18.8 8.8z'/>", "1.4"),
    c3: svg("<circle cx='9' cy='8' r='3.4'/><path d='M2.5 19.5c0-3.4 2.9-5.5 6.5-5.5 .7 0 1.4.1 2 .3'/><circle cx='16.5' cy='15.5' r='3.6'/><path d='M19.2 18.2 22 21'/>", "1.4"),
    t1: svg(RECIBO + aspaRoja(17.5, 16.5), "1.3"),
    t2: svg("<path d='M2.5 7l7-3.4 7 3.4v7l-7 3.4-7-3.4z'/><path d='M2.5 7l7 3.4 7-3.4M9.5 10.4v7'/>" + aspaRoja(17.5, 16.5), "1.3"),
    t3: svg("<circle cx='4.6' cy='12' r='3.3' stroke='" + ROJO_CALIDO + "'/><path d='M3.2 12h2.8' stroke='" + ROJO_CALIDO + "'/><rect x='8.4' y='7.6' width='7.2' height='8.8' rx='1.6'/><path d='M11.3 10.6l1.1-.9v4.6'/><circle cx='19.4' cy='12' r='3.3' stroke='" + ROJO_CALIDO + "'/><path d='M18 12h2.8M19.4 10.6v2.8' stroke='" + ROJO_CALIDO + "'/>", "1.3"),
    t4: svg("<path d='M1.5 4h2.2l2.6 9.5h8.4'/><circle cx='8' cy='17.5' r='1.3'/><circle cx='14' cy='17.5' r='1.3'/><path d='M8 4h8v7H8z'/><path d='M16.5 13.5l5.5 5.5M22 13.5l-5.5 5.5' stroke='" + ROJO_CALIDO + "' stroke-width='2.2'/>", "1.3"),
    t5: svg("<path d='M2 8h2.2l2.6 9.5h9.4l2.2-7H6'/><circle cx='9' cy='20.5' r='1.3'/><circle cx='15.5' cy='20.5' r='1.3'/><path d='M17 4H7M10.2 1.2L7 4l3.2 2.8'/>", "1.3"),
    t6: svg(RECIBO + "<circle cx='17.5' cy='16.5' r='4.6' stroke='" + ROJO_CALIDO + "'/><path d='M16.1 14.6v3.8M18.9 14.6v3.8' stroke='" + ROJO_CALIDO + "'/>", "1.3"),
    b1: svg("<rect x='1.5' y='4' width='11' height='14' rx='1.6'/><rect x='5.6' y='2.4' width='2.8' height='2.8' rx='.8'/><circle cx='7' cy='9.4' r='2'/><path d='M4 15c0-1.7 1.3-2.7 3-2.7s3 1 3 2.7'/><path d='M13.5 9.5h5l3.2 3.2v8.3h-8.2z'/><circle cx='17.6' cy='16.4' r='2.7'/><path d='M17.6 14.7v3.4M16.7 15.6h1.8'/>", "1.25"),
    b2: svg("<circle cx='4.6' cy='7' r='1.9'/><path d='M1.6 13c0-1.7 1.3-2.9 3-2.9'/><circle cx='10.8' cy='5.8' r='2.6'/><path d='M6.6 13.4c0-2.4 1.9-4 4.2-4s4.2 1.6 4.2 4'/><circle cx='17' cy='7' r='1.9'/><path d='M20 13c0-1.7-1.3-2.9-3-2.9'/><path d='M12.6 14h5.6l2.8 2.8v5.4h-8.4z'/><path d='M14.2 17.6h4M14.2 19.6h4'/>", "1.25"),
    p0: svg("<rect x='1.5' y='6' width='21' height='12' rx='2'/><circle cx='12' cy='12' r='3'/><path d='M5 9.5v5M19 9.5v5'/>", "1.4"),
    p1: svg("<path d='M2.5 6.5h19v3.4a2.1 2.1 0 000 4.2v3.4h-19v-3.4a2.1 2.1 0 000-4.2z'/><path d='M7.5 10.5h9M7.5 13.5h6'/>", "1.4"),
    p3: svg("<rect x='2.5' y='4' width='19' height='16' rx='2.2'/><circle cx='8.5' cy='10.5' r='2.4'/><path d='M5 16.5c0-2 1.6-3.2 3.5-3.2s3.5 1.2 3.5 3.2'/><path d='M14.5 9.5h4.5M14.5 12.5h4.5M14.5 15.5h3'/>", "1.4"),
    p4: svg("<circle cx='8' cy='8.5' r='3'/><path d='M2.5 18.5c0-3 2.4-5 5.5-5s5.5 2 5.5 5'/><circle cx='16.5' cy='9.5' r='2.4'/><path d='M15 14.2c2.9-.5 5.5 1.1 5.5 4.3'/>", "1.4")
};

export var LOGO_NIUBIZ: string = "url(\"data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 158 40' fill='none' stroke='white' stroke-width='8' stroke-linecap='round' stroke-linejoin='round'><path d='M6 32V22a10 10 0 0 1 20 0v10'/><path d='M38 32V12'/><path d='M50 12v10a10 10 0 0 0 20 0V12'/><path d='M82 32V6'/><circle cx='92' cy='22' r='10'/><path d='M114 32V12'/><path d='M124 12h18l-18 20h18'/><circle cx='150' cy='14' r='3.6' fill='#00AEEF' stroke='none'/><circle cx='150' cy='30' r='3.6' fill='#00AEEF' stroke='none'/></svg>") + "\")";

export function construirCss(): string {
    var reglasIconos: string = "";
    for (var clave in ICONOS) {
        if (ICONOS.hasOwnProperty(clave)) {
            reglasIconos += ".sct-ic-" + clave + "{background-image:" + ICONOS[clave] + ";}\n";
        }
    }

    // CSS COMÚN (aplica a todas las resoluciones)
    var cssBase: string = ""
        + ".sct-boleta select{-webkit-appearance:none;appearance:none;background-color:#201F1E !important;color:#FFF !important;border:1px solid rgba(255,255,255,0.35) !important;border-radius:6px !important;height:30px !important;font-size:13px !important;padding:2px 26px 2px 8px !important;}\n"
        + ".sct-boleta #btnToggle{background-color:#A81020 !important;color:#FFFFFF !important;border:none !important;border-radius:8px !important;}\n"
        + ".dark .win-pivot-header-selected{border-bottom:3px solid " + ROJO_CALIDO + " !important;}\n"
        + ".dark .win-pivot .win-pivot-navbutton{display:none !important;}\n"
        + ".sct-cli-card{border:" + BORDE_TARJETA + " !important;border-bottom:none !important;border-radius:14px 14px 0 0 !important;box-sizing:border-box !important;padding:4px 12px !important;}\n"
        + ".sct-cli-card *{font-size:12px !important;line-height:1.2 !important;}\n"
        + ".sct-dom-card{border:" + BORDE_TARJETA + " !important;border-top:1px solid rgba(255,255,255,0.12) !important;border-radius:0 0 14px 14px !important;box-sizing:border-box !important;padding:4px 12px !important;}\n"
        + ".sct-dom-card *{font-size:12px !important;line-height:1.25 !important;}\n"
        + ".sct-dom-card .sct-dom-h{color:" + ROJO + " !important;}\n"
        + ".sct-cli-card,.sct-cli-card [class*=\"minHeight\"],.sct-dom-card [class*=\"minHeight\"]{min-height:0 !important;}\n"
        + ".sct-cli-card *,.sct-dom-card *{min-height:0 !important;}\n"
        + ".sct-cli-empty{border:" + BORDE_TARJETA + " !important;border-radius:14px !important;background-color:" + FONDO_TARJETA + " !important;box-sizing:border-box !important;min-height:0 !important;}\n"
        + ".sct-cli-empty .primaryButton{background-color:" + ROJO + " !important;border-radius:8px !important;}\n"
        + ".sct-ghost{background:transparent !important;border:none !important;box-shadow:none !important;}\n"
        + ".sct-ghost,.sct-ghost *{pointer-events:none !important;}\n"
        + ".sct-ghost .fields.row,.sct-ghost .fields.row *,.sct-ghost .panel-footer,.sct-ghost .panel-footer *{pointer-events:auto !important;}\n"
        + ".dark .commerceTabControl.righttabs > .tabContent,.dark .transactionLinesPane,.sct-cli-card,.sct-dom-card,.fields.row,.panel-footer,#ButtonGrid4Control{background-color:" + FONDO_TARJETA + " !important;background-image:none !important;}\n"
        + ".sct-tbtn::before,.sct-bbtn::before,.sct-pbtn::before{content:none !important;}\n"
        + ".sct-tbtn > *:not(i.sct-ic),#ButtonGrid4Control .sct-pbtn > *:not(i.sct-ic){display:none !important;}\n"
        + ".sct-ic{position:absolute;background-repeat:no-repeat;background-position:center;background-size:contain;pointer-events:none;}\n"
        + ".sct-cbtn .sct-ic{left:28px;top:50%;transform:translateY(-50%);width:46px;height:46px;}\n"
        + ".sct-tbtn .sct-ic{left:50%;top:20px;transform:translateX(-50%);width:60px;height:60px;}\n"
        + ".sct-bbtn .sct-ic{left:26px;top:50%;transform:translateY(-50%);width:66px;height:66px;}\n"
        + "#ButtonGrid4Control .sct-pbtn .sct-ic{left:50%;top:7px;transform:translateX(-50%);width:32px;height:32px;}\n"
        + reglasIconos
        // Sin `position`: el POS ya coloca los botones de cuadricula en absoluto con sus propias
        // coordenadas, asi que el icono interior sigue teniendo su ancestro posicionado.
        + ".sct-cbtn{border-radius:12px !important;overflow:hidden !important;background-image:none !important;}\n"
        + ".sct-cbtn::after{content:'';position:absolute;left:96px;top:18%;height:64%;width:1px;background:rgba(255,255,255,0.45);}\n"
        + ".sct-cbtn > div{position:absolute !important;left:120px !important;right:12px !important;top:50% !important;bottom:auto !important;transform:translateY(-50%) !important;text-align:left !important;}\n"
        + ".sct-cbtn > div *{font-size:19px !important;font-weight:400 !important;color:#FFF !important;line-height:1.2 !important;}\n"
        + ".sct-cbtn-primary{background-color:" + ROJO + " !important;border:none !important;}\n"
        + ".sct-cbtn-primary::after{background:rgba(255,255,255,0.55);}\n"
        + ".sct-cbtn-dark{background-color:#1B1A19 !important;border:1px solid rgba(255,255,255,0.14) !important;border-left:4px solid " + ROJO + " !important;}\n"
        + ".sct-tbtn{border-radius:12px !important;overflow:hidden !important;background-image:none !important;}\n"
        + ".sct-tbtn-dark{background-color:#1B1A19 !important;border:1px solid rgba(255,255,255,0.16) !important;}\n"
        + ".sct-tbtn-outline{background-color:#1B1A19 !important;border:1.5px solid " + ROJO + " !important;}\n"
        + ".sct-tbtn-fill{background-color:" + ROJO + " !important;border:1.5px solid " + ROJO + " !important;}\n"
        // El rotulo se ancla ABAJO, no a un `top` fijo. Estaba en top:96px, medida pensada para
        // tiles de 170px de alto: cuando el tile es mas bajo (el POS los da a 72px, y el reparto
        // los calcula segun la tarjeta), el rotulo caia fuera y `overflow:hidden` se lo comia. Con
        // `bottom` vale para cualquier alto.
        + ".sct-tbtn::after{white-space:pre-line;position:absolute;left:6px;right:6px;top:auto;bottom:8px;text-align:center;color:#FFF;font-size:17px;line-height:1.3;}\n"
        + ".sct-t1::after{content:'Anular\\A Pago';}\n"
        + ".sct-t2::after{content:'Anular\\A Producto';}\n"
        + ".sct-t3::after{content:'Definir\\A Cantidad';}\n"
        + ".sct-t4::after{content:'Cancelar\\A Transacción';}\n"
        + ".sct-t5::after{content:'Volver a\\A Transacción';}\n"
        + ".sct-t6::after{content:'Suspender\\A Transacción';}\n"
        + ".sct-bbtn{border-radius:12px !important;background-color:#1B1A19 !important;border:1px solid rgba(255,255,255,0.14) !important;border-left:4px solid " + ROJO + " !important;overflow:hidden !important;background-image:none !important;}\n"
        + ".sct-bbtn::after{content:'';position:absolute;left:114px;top:20%;height:60%;width:1px;background:rgba(255,255,255,0.4);}\n"
        + ".sct-bbtn > div:first-of-type{position:absolute !important;left:138px !important;right:14px !important;top:50% !important;bottom:auto !important;transform:translateY(-50%) !important;text-align:left !important;}\n"
        + ".sct-bbtn .sct-b-t{display:block !important;font-size:22px !important;font-weight:600 !important;color:#FFF !important;line-height:1.2 !important;}\n"
        + ".sct-bbtn .sct-b-s{display:block !important;font-size:15px !important;font-weight:400 !important;color:#E8E6E3 !important;line-height:1.3 !important;margin-top:3px !important;}\n"
        + "#ButtonGrid4Control .sct-pbtn::after{white-space:pre-line;position:absolute;left:3px;right:3px;bottom:7px;top:auto;text-align:center;color:#FFF;font-size:11px;line-height:1.15;}\n"
        + "#ButtonGrid4Control .sct-p0::after{content:'Efectivo';}\n"
        + "#ButtonGrid4Control .sct-p1::after{content:'Vales\\A Terranova';}\n"
        + "#ButtonGrid4Control .sct-p3::after{content:'Empleado\\A en planilla';}\n"
        + "#ButtonGrid4Control .sct-p4::after{content:'A Cuenta\\A de Terceros';}\n"
        + "#ButtonGrid4Control .sct-p2::after{content:none !important;}\n"
        + "#ButtonGrid4Control .buttonGridButton.sct-p2 i.sct-ic{display:block !important;left:50% !important;top:50% !important;transform:translate(-50%,-50%) !important;width:190px !important;height:46px !important;background-image:" + LOGO_NIUBIZ + " !important;background-size:contain !important;}\n";

    // CSS AMPLIO (1920x855)
    var cssAmplio: string = ""
        // El alto NO se fija aqui. Estaba clavado en 468px, medido contra la zona de UAT (490 de
        // alto). En otros entornos HQ da otra zona — en master da 360 — y como la zona tiene
        // overflow:hidden, se recortaban 108px: la mitad inferior del numpad desaparecia y con ella
        // el boton Intro. Ahora el control toma el alto de SU zona, y de dimensionar la zona se
        // encarga ThemeEngine.ajustarNumpad(), que lo calcula midiendo la pantalla real.
        + ".dark .commerceTabControl.righttabs{flex-direction:column !important;height:100% !important;}\n"
        + ".dark .commerceTabControl.righttabs .tabsContainer{order:-1;display:flex !important;flex-direction:row !important;gap:8px;height:74px !important;width:100% !important;margin:0 0 10px 0 !important;}\n"
        + ".dark .commerceTabControl.righttabs .tabsContainer .tab{width:107px !important;height:70px !important;border:1px solid rgba(255,255,255,0.25) !important;border-radius:10px !important;background:#161514 !important;margin:0 !important;position:relative !important;}\n"
        + ".dark .commerceTabControl.righttabs .tabsContainer .tab:hover,.dark .commerceTabControl.righttabs .tabsContainer .tab.hover,.dark .commerceTabControl.righttabs .tabsContainer .tab.pressed{border-color:" + ROJO + " !important;background:#1B1A19 !important;}\n"
        + ".dark .commerceTabControl.righttabs .tab.selected,.dark .commerceTabControl.righttabs .tabsContainer .tab:focus,.dark .commerceTabControl.righttabs .tabsContainer .tab:active,.dark .commerceTabControl.righttabs .tabsContainer .tab.selected:hover{border-color:" + ROJO + " !important;outline-color:" + ROJO + " !important;}\n"
        + ".dark .commerceTabControl.righttabs .tab .indicator{display:none !important;}\n"
        + ".dark .commerceTabControl.righttabs .tab .icon{filter:none !important;position:absolute !important;left:50% !important;top:14px !important;transform:translateX(-50%) !important;width:30px !important;height:30px !important;background-size:contain !important;background-position:center !important;background-repeat:no-repeat !important;margin:0 !important;}\n"
        + ".dark .commerceTabControl.righttabs .tab .text{display:block !important;position:absolute !important;left:0 !important;right:0 !important;top:auto !important;bottom:12px !important;font-size:11px !important;font-weight:600 !important;letter-spacing:0.6px !important;color:#FFF !important;text-align:center !important;line-height:1.1 !important;margin:0 !important;transform:none !important;}\n"
        + ".sct-tab0 .icon{background-image:" + ICONOS["tab0"] + " !important;}\n"
        + ".sct-tab1 .icon{background-image:" + ICONOS["tab1"] + " !important;}\n"
        + ".sct-tab2 .icon{background-image:" + ICONOS["tab2"] + " !important;}\n"
        + ".sct-tab3 .icon{background-image:" + ICONOS["tab3"] + " !important;}\n"
        + ".dark .commerceTabControl.righttabs > .tabContent{flex:1 1 auto !important;height:auto !important;border:" + BORDE_TARJETA + " !important;border-radius:12px !important;padding:12px !important;box-sizing:border-box !important;overflow:hidden !important;}\n"
        + ".dark .commerceTabControl.righttabs .tabContent > .layoutControl,.dark .commerceTabControl.righttabs .tabContent .numpad,.dark .commerceTabControl.righttabs .tabContent .numpad > *,.dark .commerceTabControl.righttabs .tabContent .numpad-control{width:100% !important;height:auto !important;overflow:visible !important;}\n"
        + ".dark .commerceTabControl.righttabs .tabContent .numpad-control-buttons{width:388px !important;margin:10px auto 0 auto !important;transform:translateX(-12px) !important;}\n"
        + ".dark .numpad-control .numpad-control-input-wrapper{height:44px !important;min-height:0 !important;}\n"
        + ".dark .numpad-control .numpad-control-buttons button{background-color:rgba(255,255,255,0.13) !important;color:#FFF !important;border:1px solid rgba(255,255,255,0.18) !important;border-radius:10px !important;min-height:50px !important;max-height:54px !important;font-size:35px !important;}\n"
        + ".dark .numpad-control .numpad-control-buttons button *{font-size:35px !important;}\n"
        + ".dark .numpad-control .numpad-control-buttons button.enter{background-color:#A81020 !important;color:#FFF !important;border:none !important;border-radius:10px !important;min-height:46px !important;max-height:50px !important;}\n"
        + ".dark .numpad-control-buttons button[aria-label='Habilitar edición de texto'],.dark .numpad-control-buttons button[aria-label='Habilitar edición de texto'] *{font-size:20px !important;}\n"
        + ".dark .numpad-control-buttons button[aria-label='Más/Menos'],.dark .numpad-control-buttons button[aria-label='Más/Menos'] *,.dark .numpad-control-buttons button[aria-label='Veces'],.dark .numpad-control-buttons button[aria-label='Veces'] *{font-size:24px !important;}\n"
        + ".dark .numpad-control-label{color:#A19F9D !important;font-size:15px !important;font-style:italic !important;margin-bottom:6px !important;}\n"
        + ".fields.row{border:1px solid rgba(255,255,255,0.14) !important;border-radius:14px 14px 0 0 !important;border-bottom:none !important;padding:10px 16px 14px 16px !important;box-sizing:border-box !important;display:flex !important;flex-direction:column !important;align-items:stretch !important;gap:0 !important;}\n"
        + ".fields.row *{color:#E8E6E3 !important;font-size:13px !important;line-height:1.2 !important;}\n"
        + ".fields.row .secondaryFontColor,.fields.row .h6{color:#A19F9D !important;}\n"
        + ".fields.row>*{width:100% !important;flex:0 0 auto !important;}\n"
        + ".fields.row .right{display:flex !important;flex-flow:column nowrap !important;max-height:none !important;width:100% !important;border-top:1px solid rgba(255,255,255,0.12) !important;margin-top:4px !important;padding-top:4px !important;}\n"
        + ".fields.row .right>*{width:100% !important;height:24px !important;padding:0 !important;min-height:0 !important;}\n"
        + ".fields.row>*:not(.right){height:auto !important;overflow:visible !important;}\n"
        + ".fields.row>*:not(.right)>*{height:24px !important;min-height:0 !important;padding:0 !important;margin:0 !important;}\n"
        + ".fields.row .sct-mt{border-top:1px solid rgba(255,255,255,0.12) !important;margin-top:4px !important;padding-top:4px !important;height:auto !important;min-height:26px !important;}\n"
        + ".fields.row .sct-mt *{line-height:1.3 !important;}\n"
        + ".fields.row .sct-mt-v,.fields.row .sct-mt-v *{font-size:14px !important;color:#E8E6E3 !important;font-weight:400 !important;}\n"
        + ".panel-footer{border:1px solid rgba(255,255,255,0.14) !important;border-top:1px solid rgba(255,255,255,0.12) !important;border-radius:0 0 14px 14px !important;padding:10px 16px !important;box-sizing:border-box !important;}\n"
        + ".panel-footer *{color:#E8E6E3 !important;}\n"
        + ".panel-footer .h1{color:" + ROJO + " !important;font-size:30px !important;font-weight:700 !important;}\n"
        + ".dark .transactionLinesPane{border:" + BORDE_TARJETA + " !important;border-radius:14px !important;padding:2px 8px !important;box-sizing:border-box !important;}\n"
        // El ALTO y el ANCHO de la zona de pagos no se tocan: los daba la medida de UAT (452x146)
        // y en master el POS necesita 152 de alto para sus dos filas, asi que recortaba 6px del
        // bloque de NIUBIZ.
        // El DESPLAZAMIENTO tampoco: lo calcula ThemeEngine.alinearColumnaDerecha() midiendo la
        // caja de importes. Estaba fijo en 114px, otra medida de UAT.
        + ".sct-live-zona-montos{transform:translateY(-20px) !important;height:276px !important;}\n"
        + ".sct-live-zona-cliente{transform:translateY(-16px) !important;height:276px !important;}\n"
        // Sin transform ni width fijos: el desplazamiento lo calcula alinearColumnaDerecha() y el
        // ancho lo da la zona. Estaban en translateY(108px) y 452px, medidos en UAT.
        + ".sct-live-zona-boleta{height:116px !important;max-height:116px !important;min-height:0 !important;padding:10px 14px 12px 14px !important;border:1px solid rgba(255,255,255,0.12) !important;border-radius:14px !important;background:rgba(22,21,20,0.6) !important;box-sizing:border-box !important;overflow:hidden !important;}\n"
        + ".sct-live-zona-boleta .sct-titulo{font-size:17px !important;font-weight:600 !important;color:#FFFFFF !important;}\n"
        + "#ButtonGrid4Control{padding:0 !important;background:rgba(22,21,20,0.6) !important;}\n"
        // SIN GEOMETRIA. Ni posiciones ni tamanos: los pone la rejilla de la cuadricula de HQ
        // (Row / Column / ColumnSpan), y lo hace bien. Comprobado leyendo las cuatro cuadriculas:
        //   Cliente (200)        3 botones, filas 1-2-3, span 4   -> pila vertical
        //   Transacciones (210)  6 botones, 2 filas x 3 columnas  -> rejilla 3x2
        //   Boleteos (220)       2 botones, filas 1-2, span 4     -> dos barras
        //   Metodos de Pago (230) 4 en fila 1 + NIUBIZ span 4
        // Es exactamente el reparto que el tema estaba repitiendo a mano en pixeles. Al fijarlo
        // aqui, el resultado quedaba atado al numero y al orden de botones de UAT y se rompia en
        // cualquier otro entorno. El tema solo pone ASPECTO.
        + ".sct-cbtn{color:#FFFFFF !important;background-image:none !important;}\n"
        + ".sct-cbtn-primary{background-color:#C8102E !important;}\n"
        + ".sct-cbtn-dark{background-color:#1B1A19 !important;}\n"
        + ".sct-tbtn{color:#FFFFFF !important;background-image:none !important;background-color:#1B1A19 !important;}\n"
        + ".sct-tbtn.sct-t5{background-color:#C8102E !important;}\n"
        + ".sct-bbtn{background-color:#1B1A19 !important;color:#FFFFFF !important;background-image:none !important;}\n"
        // Solo aspecto. La POSICION y el TAMAÑO los pone el POS con la rejilla de la cuadricula
        // (Row / Column / ColumnSpan de HQ), que ya coloca bien los botones en cualquier entorno.
        // Antes el tema los posicionaba con left/top/width/height fijos por clase, y eso ataba el
        // resultado al numero y al orden de botones de UAT: en master, que tiene otro orden y un
        // boton mas, cada tile recibia el sitio y el icono de otro metodo de pago.
        + "#ButtonGrid4Control .sct-pbtn{background-image:none !important;background-color:rgba(22,21,20,0.6) !important;border:1px solid rgba(255,255,255,0.16) !important;border-radius:12px !important;color:#FFFFFF !important;}\n";


    // =============================================================================================
    // CSS COMPACTO (1024x768)
    // =============================================================================================
    //
    // ¡¡NO BORRAR NI "LIMPIAR" LOS VALORES DE ESTA LISTA SIN LEER EL MOTIVO!!
    //
    // Los numeros de este bloque NO son estéticos ni aproximados: salieron de medir la pantalla
    // real (getBoundingClientRect) con el POS abierto en una ventana de 1024x768 y con el usuario
    // de caja. Cada uno cuadra con otro. Si se "redondean" o se borran por parecer redundantes, la
    // pantalla se descuadra de formas que NO se ven en las medidas, solo mirándola.
    //
    // ANCLAS DE LA PANTALLA (si cambias una, tienes que cambiar su pareja):
    //
    //   x=8 .. x=634   -> columna izquierda completa (carrito, cliente, montos).
    //                     El ancho del carrito vive en ThemeEngine (propLineas: left -12, width
    //                     626, height 400) porque se escribe INLINE y el CSS no le gana.
    //                     Su pareja aqui es #TotalsPanel{width:298px} (desde x=336 acaba en 634).
    //   16px           -> aire entre la columna izquierda y la derecha (x=650).
    //   y=508          -> cierran a la vez el carrito y la tarjeta de pestañas.
    //   y=752          -> cierran A LA VEZ TRES cosas: #TotalsPanel, la fila de pagos (NIUBIZ) y
    //                     la tarjeta de direccion del cliente (.sct-dom-card, de ahi su alto 148).
    //                     De ahi salen #CustomControl1{top:460} y #ButtonGrid4{top:565}, y de ahi
    //                     que los huecos verticales sean 12 y 11 y no 16: no cabe mas.
    //   228            -> alto de la zona de cliente. Dentro caben JUSTO ficha 80 + direccion 148.
    //                     Si crece cualquiera de las dos, la otra se corta (la zona tiene
    //                     overflow:hidden y no puede crecer: topa con el carrito arriba y con el
    //                     borde de la pantalla abajo).
    //
    // REGLAS QUE PARECEN MUERTAS Y NO LO SON (ya se intento borrarlas una vez):
    //
    //   #TabControl .numpad-control-buttons{max-height:266px}  (la primera de las dos)
    //       La regla de mas abajo gana en "height", pero NO trae max-height. Sin este tope, el
    //       contenedor (que es flex) se dispara a 322px y el teclado se sale 37px de su tarjeta.
    //       MEDIDO al quitarlo. Ganar en una propiedad no es ganar en todas.
    //
    //   #ButtonGrid4Control .sct-pbtn{width:82px}  +  .sct-p2{width:340px}
    //       El bloque ancho de NIUBIZ recupera sus 340px POR ORDEN (va despues), no por
    //       especificidad. Si a la primera regla se le añade una clase mas (por ejemplo para
    //       acotarla), pasa a ganar y NIUBIZ se encoge al ancho del tile pequeño con el logo
    //       saliendose. Paso al probarlo en vivo.
    //
    //   #TabControl .numpad-control-input{height + min-height + max-height}
    //       Los tres hacen falta. El POS le pone font-size:40px INLINE y una regla base le pone
    //       min-height, y min-height gana SIEMPRE a height. Con solo height se queda en 52px y se
    //       sale por arriba de la tarjeta.
    //
    //   #ButtonGrid1, #ButtonGrid2, #ButtonGrid3{overflow:visible}
    //       Las zonas que dibuja HQ miden 300px con overflow:hidden y el control interior mide
    //       316: sin esto se recortan 16px por la derecha, justo las esquinas redondeadas, y los
    //       botones se ven "entrecortados".
    //
    //   #CustomerPanel .sct-dom-card .col, ... .pad12{min-width:0}
    //       Parece que no hace nada y es lo que arregla la direccion cortada. Los items de un
    //       contenedor flex traen min-width:auto: se NIEGAN a encogerse por debajo del ancho
    //       natural de su contenido. Con el texto en nowrap ese ancho es la linea entera, asi que
    //       las lineas median 382px dentro de una tarjeta de 320 y el texto se pintaba fuera de la
    //       vista. Borrar esta regla devuelve el bug.
    //
    //   #CustomerPanel .sct-cli-card .marginTop20 / .marginBottom12 / .marginTop12 / .pad12
    //       No son numeros al azar: recortan el AIRE de la ficha de cliente (la fila de iconos de
    //       telefono/correo mide 15px y arrastraba 20px de margen arriba y 12 abajo). Sin ellos la
    //       ficha vuelve a 120px, y 120 + 148 = 268 en una zona de 228: se corta.
    //
    //   -webkit-line-clamp:2 en .sct-dom-card .h4.ellipsis
    //       Es el tope de seguridad de la direccion. Sin el, una direccion larga crece sin limite
    //       y desborda la tarjeta. Con el, corta con puntos suspensivos.
    //
    // Contexto completo de cada decision: vault de Obsidian, 006-MEMORIA, notas 14 y 23.
    // =============================================================================================
    var cssCompacto: string = ""
        // Reparto vertical de la columna derecha en 768px de alto (medido en vivo):
        //   pestanas 108-170 | tarjeta numpad hasta 508 | Boleta 516-610 | tiles 618-745
        // top 132->48: las pestanas arrancan a la MISMA altura que el carrito (y=108), como en
        // la vista amplia. height 422->400 para que quepan las pestanas ARRIBA y el Enter entero.
        + "#TabControl{position:absolute !important;left:518px !important;top:48px !important;right:auto !important;width:452px !important;height:400px !important;transform:none !important;pointer-events:none !important;}\n"
        // El carrito perdia su tarjeta en compacto (borde 0, radio 0) mientras el resto de
        // paneles si la tenian.
        + ".transactionLinesPane{border:1px solid rgba(255,255,255,0.12) !important;border-radius:14px !important;box-sizing:border-box !important;overflow:hidden !important;}\n"
        // Las pestanas van ENCIMA del numpad (en fila). Sin esto el rail se queda en fila y las
        // manda a x=1092: fuera de una pantalla de 1024.
        + ".commerceTabControl.righttabs{flex-direction:column !important;}\n"
        + ".commerceTabControl.righttabs .tabsContainer{order:-1 !important;display:flex !important;flex-direction:row !important;gap:6px !important;width:340px !important;height:62px !important;margin:0 0 8px auto !important;}\n"
        + ".commerceTabControl.righttabs .tabsContainer .tab{width:80px !important;height:58px !important;margin:0 !important;}\n"
        // El bloque de teclas trae altura propia (304px) y no cabia: se fija junto al tamano de tecla.
        // CUIDADO CON LA CASCADA: mas abajo (bloque del numpad) hay otra regla para este mismo
        // selector. Como va despues, gana en "height" — pero NO trae max-height, asi que el
        // max-height de AQUI es el que manda de verdad. Y no es decorativo: el contenedor es un
        // flex y sin tope se dispara a 322px (medido en vivo al quitarlo). Los dos valores se
        // mantienen iguales a proposito para que no haya sorpresas.
        // 266 = 5 filas de 50px + 4 separaciones de 4px.
        + "#TabControl .numpad-control-buttons{height:266px !important;max-height:266px !important;min-height:0 !important;}\n"
        // (Aqui habia dos reglas mas, teclas a 32px y su tipografia a 20px, que las de mas abajo
        // pisaban por completo: no pintaban nada. Se retiran para que el fichero no engane.)
        + "#TabControl .commerceTabControl.righttabs{width:452px !important;height:400px !important;overflow:visible !important;box-sizing:border-box !important;}\n"
        + "#TabControl .commerceTabControl.righttabs .tabsContainer{display:flex !important;flex-direction:row !important;justify-content:flex-start !important;align-items:flex-start !important;width:340px !important;min-width:340px !important;max-width:340px !important;height:62px !important;gap:6px !important;padding:0 !important;margin:0 0 8px 112px !important;left:0 !important;right:auto !important;transform:none !important;overflow:visible !important;box-sizing:border-box !important;pointer-events:auto !important;}\n"
        + "#TabControl .commerceTabControl.righttabs .tabsContainer .tab{position:relative !important;flex:0 0 80px !important;width:80px !important;min-width:80px !important;max-width:80px !important;height:58px !important;left:auto !important;right:auto !important;top:auto !important;margin:0 !important;transform:none !important;border-radius:9px !important;box-sizing:border-box !important;border:1px solid rgba(255,255,255,0.25) !important;background:#161514 !important;}\n"
        + "#TabControl .commerceTabControl.righttabs .tabsContainer .tab:hover,#TabControl .commerceTabControl.righttabs .tabsContainer .tab.hover,#TabControl .commerceTabControl.righttabs .tabsContainer .tab.pressed{border-color:" + ROJO + " !important;background:#1B1A19 !important;}\n"
        + "#TabControl .commerceTabControl.righttabs .tab.selected,#TabControl .commerceTabControl.righttabs .tabsContainer .tab:focus,#TabControl .commerceTabControl.righttabs .tabsContainer .tab:active,#TabControl .commerceTabControl.righttabs .tabsContainer .tab.selected:hover{border-color:" + ROJO + " !important;outline-color:" + ROJO + " !important;}\n"
        + "#TabControl .commerceTabControl.righttabs .tab .indicator{display:none !important;}\n"
        + "#TabControl .tabsContainer .tab .icon{filter:none !important;position:absolute !important;left:50% !important;transform:translateX(-50%) !important;width:24px !important;height:24px !important;top:8px !important;background-size:contain !important;background-position:center !important;background-repeat:no-repeat !important;}\n"
        + "#TabControl .tabsContainer .tab .text{display:block !important;position:absolute !important;left:0 !important;right:0 !important;text-align:center !important;bottom:7px !important;font-size:9px !important;letter-spacing:0.2px !important;color:#FFF !important;font-weight:600 !important;}\n"
        + ".sct-tab0 .icon{background-image:" + ICONOS["tab0"] + " !important;}\n"
        + ".sct-tab1 .icon{background-image:" + ICONOS["tab1"] + " !important;}\n"
        + ".sct-tab2 .icon{background-image:" + ICONOS["tab2"] + " !important;}\n"
        + ".sct-tab3 .icon{background-image:" + ICONOS["tab3"] + " !important;}\n"
        + "#TabControl .commerceTabControl.righttabs > .tabContent{flex:0 0 330px !important;width:340px !important;height:330px !important;margin-left:112px !important;padding:10px 12px !important;box-sizing:border-box !important;overflow:hidden !important;pointer-events:auto !important;border:" + BORDE_TARJETA + " !important;border-radius:12px !important;}\n"
        // El translateX(-12px) venia de cuando el numpad tenia otro ancho: dejaba el bloque 22px
        // descentrado (se metia 11px en el borde izquierdo de la tarjeta y sobraban 11px a la
        // derecha). Medido y corregido: ahora los margenes quedan en 1px y -1px.
        + "#TabControl .numpad-control{width:316px !important;height:auto !important;margin:2px auto 0 auto !important;transform:none !important;}\n"
        // El campo "Escribir" traia font-size:40px en un estilo INLINE del POS y se salia 9px por
        // ENCIMA del interior de la tarjeta. Ojo: no basta con bajar la fuente y poner height —
        // una regla base del POS le pone min-height, y min-height gana siempre a height. Hay que
        // fijar los tres (height, min-height y max-height) o el campo se queda en 52px.
        + "#TabControl .numpad-control-input-wrapper{width:316px !important;height:34px !important;min-height:34px !important;max-height:34px !important;margin-left:auto !important;margin-right:auto !important;}\n"
        + "#TabControl .numpad-control-input{font-size:22px !important;height:34px !important;min-height:34px !important;max-height:34px !important;line-height:34px !important;}\n"
        // Reparto vertical dentro de la tarjeta (interior util: 310px):
        //   campo 34 + separacion 8 + teclado 266 = 308. Sobran 2px. Antes sobraban 31 abajo.
        + "#TabControl .numpad-control-buttons{width:316px !important;height:266px !important;margin:8px auto 0 auto !important;transform:none !important;}\n"
        // Tecla 44 -> 50px: es lo que hace falta para que el teclado llene la tarjeta en vez de
        // dejar 31px muertos abajo, y de paso se agradece en una pantalla tactil.
        + "#TabControl .numpad-control-buttons button{background-color:rgba(255,255,255,0.13) !important;color:#FFF !important;border:1px solid rgba(255,255,255,0.18) !important;height:50px !important;min-height:50px !important;max-height:50px !important;font-size:28px !important;border-radius:8px !important;}\n"
        + "#TabControl .numpad-control-buttons button *{font-size:28px !important;}\n"
        + "#TabControl .numpad-control-buttons button[aria-label='Habilitar edición de texto'],#TabControl .numpad-control-buttons button[aria-label='Habilitar edición de texto'] *{font-size:16px !important;}\n"
        + "#TabControl .numpad-control-buttons button[aria-label='Más/Menos'],#TabControl .numpad-control-buttons button[aria-label='Más/Menos'] *,#TabControl .numpad-control-buttons button[aria-label='Veces'],#TabControl .numpad-control-buttons button[aria-label='Veces'] *{font-size:21px !important;}\n"
        + "#TabControl .numpad-control-buttons .enter{width:316px !important;height:50px !important;min-height:50px !important;max-height:50px !important;background-color:#A81020 !important;color:#FFF !important;border:none !important;}\n"
        + "#TabControl .numpad-control-label{color:#A19F9D !important;font-size:12px !important;font-style:italic !important;margin-bottom:3px !important;}\n"
        + "#ButtonGrid1Control .sct-cbtn .sct-ic{left:18px !important;width:36px !important;height:36px !important;}\n"
        + "#ButtonGrid1Control .sct-cbtn::after{left:70px !important;}\n"
        + "#ButtonGrid1Control .sct-cbtn > div{left:88px !important;right:8px !important;}\n"
        + "#ButtonGrid1Control .sct-cbtn > div *{font-size:15px !important;}\n"
        + "#ButtonGrid2Control .sct-tbtn .sct-ic{width:44px !important;height:44px !important;top:14px !important;}\n"
        + "#ButtonGrid2Control .sct-tbtn::after{top:auto !important;bottom:8px !important;font-size:13px !important;line-height:1.15 !important;}\n"
        + "#ButtonGrid3Control .sct-bbtn .sct-ic{left:18px !important;width:46px !important;height:46px !important;}\n"
        + "#ButtonGrid3Control .sct-bbtn::after{left:80px !important;}\n"
        + "#ButtonGrid3Control .sct-bbtn > div:first-of-type{left:96px !important;right:10px !important;}\n"
        + "#ButtonGrid3Control .sct-b-t{font-size:16px !important;}\n"
        + "#ButtonGrid3Control .sct-b-s{font-size:12px !important;}\n"
        // Alto 94 -> 78: su contenido (titulo 12px + select 24 + boton 26 + relleno) necesita ~78,
        // y los 16 que sobraban hacen falta abajo para que la fila de pagos entre entera. A 1024,
        // entre el fondo de la tarjeta de pestanas y el fondo de los importes hay 244px justos.
        + "#CustomControl1{width:340px !important;height:78px !important;min-height:0 !important;max-height:78px !important;padding:6px 10px 7px !important;box-sizing:border-box !important;overflow:hidden !important;border:1px solid rgba(255,255,255,0.12) !important;border-radius:14px !important;background:rgba(22,21,20,0.6) !important;}\n"
        // El titulo de la tarjeta ("Boleta"/"Factura") solo tenia regla en el bloque AMPLIO
        // (.sct-live-zona-boleta .sct-titulo, 17px). En compacto se quedaba con el h3 nativo del
        // POS dentro de una tarjeta de 94px, que es casi un tercio del alto disponible.
        // Se ancla por las DOS vias: por id y por la clase que el motor pone en la zona. Si algun
        // dia la zona resulta ser un envoltorio de #CustomControl1 en vez del control mismo, el
        // ancla por id dejaria de casar y la regla pareceria aplicada sin estarlo.
        + "#CustomControl1 .sct-titulo,.sct-boleta .sct-titulo{font-size:12px !important;font-weight:600 !important;color:#FFFFFF !important;line-height:1.1 !important;margin:0 !important;}\n"
        + "#CustomControl1 select{width:100% !important;height:24px !important;min-height:24px !important;font-size:11px !important;}\n"
        + "#CustomControl1 #btnToggle{width:100% !important;height:26px !important;min-height:26px !important;max-height:26px !important;font-size:11px !important;line-height:1 !important;}\n"
        // Sin alto: lo calcula acomodarColumnaDerecha() con el espacio que quede hasta el fondo de
        // los importes. Estaba en 127px y el POS necesita 152 para sus dos filas, asi que recortaba
        // 25px de NIUBIZ.
        + "#ButtonGrid4, #ButtonGrid4Control, #ButtonGrid4Control .buttonsContainer{width:340px !important;overflow:hidden !important;padding:0 !important;}\n"
        + "#ButtonGrid4Control .sct-pbtn{border-radius:9px !important;}\n"
        // Icono 25 -> 30px y texto 9 -> 11px (el rotulo largo de .sct-p4, 10.5). La CAJA no cambia:
        // sigue en 82x64. Solo crecen el icono y la tipografia, que a 9px eran ilegibles.
        //
        // PRESUPUESTO VERTICAL DEL TILE (64px de alto, no hay mas):
        //   icono: top 4 + 30            -> termina en 35
        //   texto: 2 lineas de 11 x 1.05 -> 23px, con bottom 3 empieza en 38
        //   quedan 3px de aire entre uno y otro. Es el limite: subir el icono a 32 o el texto a
        //   11.5 los hace chocar. Si se quiere mas, hay que crecer la caja, y eso descuadra la
        //   fila de pagos (que esta alineada con la caja de montos de la izquierda).
        + "#ButtonGrid4Control .sct-pbtn .sct-ic{width:30px !important;height:30px !important;top:4px !important;}\n"
        + "#ButtonGrid4Control .sct-pbtn::after{left:2px !important;right:2px !important;bottom:3px !important;font-size:11px !important;line-height:1.05 !important;}\n"
        + "#ButtonGrid4Control .sct-p4::after{font-size:10.5px !important;}\n"
        + "#ButtonGrid4Control .buttonGridButton.sct-p2 i.sct-ic{width:135px !important;height:34px !important;}\n"
        + "#TotalsPanel .fields.row{border:1px solid rgba(255,255,255,0.14) !important;border-radius:14px 14px 0 0 !important;border-bottom:none !important;box-sizing:border-box !important;display:flex !important;flex-direction:column !important;align-items:stretch !important;gap:0 !important;height:188px !important;min-height:188px !important;max-height:188px !important;padding:6px 12px 8px !important;overflow:hidden !important;}\n"
        + "#TotalsPanel .fields.row *{color:#E8E6E3 !important;font-size:13px !important;line-height:1.2 !important;}\n"
        + "#TotalsPanel .fields.row .secondaryFontColor,#TotalsPanel .fields.row .h6{color:#A19F9D !important;}\n"
        + "#TotalsPanel .fields.row>*{width:100% !important;flex:0 0 auto !important;}\n"
        + "#TotalsPanel .fields.row .right{display:flex !important;flex-flow:column nowrap !important;width:100% !important;border-top:1px solid rgba(255,255,255,0.12) !important;margin-top:2px !important;padding-top:2px !important;max-height:none !important;}\n"
        + "#TotalsPanel .fields.row .right>*{width:100% !important;height:20px !important;min-height:20px !important;padding:0 !important;overflow:visible !important;}\n"
        + "#TotalsPanel .fields.row>*:not(.right){height:auto !important;overflow:visible !important;}\n"
        + "#TotalsPanel .fields.row>*:not(.right)>*{height:20px !important;min-height:20px !important;padding:0 !important;margin:0 !important;overflow:visible !important;}\n"
        + "#TotalsPanel .fields.row .sct-mt{border-top:none !important;margin-top:2px !important;padding-top:4px !important;height:28px !important;min-height:28px !important;overflow:visible !important;box-sizing:border-box !important;}\n"
        + "#TotalsPanel .fields.row .sct-mt *{overflow:visible !important;line-height:1.1 !important;}\n"
        + "#TotalsPanel .fields.row .sct-mt-v,#TotalsPanel .fields.row .sct-mt-v *{position:relative !important;top:-1px !important;height:auto !important;min-height:0 !important;max-height:none !important;overflow:visible !important;font-size:13px !important;line-height:1 !important;font-weight:400 !important;}\n"
        + "#TotalsPanel .panel-footer{border:1px solid rgba(255,255,255,0.14) !important;border-top:1px solid rgba(255,255,255,0.12) !important;border-radius:0 0 14px 14px !important;box-sizing:border-box !important;height:40px !important;min-height:40px !important;max-height:40px !important;padding:4px 12px !important;overflow:hidden !important;}\n"
        + "#TotalsPanel .panel-footer *{color:#E8E6E3 !important;}\n"
        + "#TotalsPanel .panel-footer .h1{color:" + ROJO + " !important;font-size:25px !important;font-weight:700 !important;line-height:1 !important;}\n"
        // BUG CORREGIDO (1024x768): con un cliente REAL cargado, la tarjeta de cliente (120px) mas
        // la de direccion (140px) suman 260px dentro de una zona de 228 con overflow:hidden — se
        // cortaban 32px por abajo. El cliente de pruebas no lo destapaba porque su ficha es mas
        // corta. En el layout amplio no pasa: alli la zona mide 276px.
        //
        // No se puede agrandar la zona: su fondo (y=752) esta alineado con NIUBIZ y con la caja de
        // montos, y por arriba topa con el carrito. Asi que se recorta el AIRE de la ficha, que era
        // mucho: la fila de iconos de telefono/correo mide 15px y arrastraba 20px de margen arriba
        // y 12 abajo. Con esto la tarjeta pasa de 120 a 80px y el total a 220 (medido en vivo:
        // corte 0). No se toca ningun tamano de letra ni de icono.
        + "#CustomerPanel .sct-cli-card .marginTop20{margin-top:8px !important;}\n"
        + "#CustomerPanel .sct-cli-card .marginBottom12{margin-bottom:4px !important;}\n"
        + "#CustomerPanel .sct-cli-card .marginTop12{margin-top:6px !important;}\n"
        + "#CustomerPanel .sct-cli-card .pad12{padding-top:6px !important;}\n"
        // DIRECCION CORTADA — no era falta de sitio, era un desbordamiento de flexbox.
        //
        // Las lineas de la direccion median 382px DENTRO de una tarjeta de 320: el texto se pintaba
        // en 62px que no se ven. La causa es el `min-width:auto` que traen por defecto los items de
        // un contenedor flex: se niegan a encogerse por debajo del ancho NATURAL de su contenido, y
        // como el texto va en nowrap, ese ancho natural es la linea entera. Con min-width:0 el item
        // ya puede encogerse a los 270px reales de la tarjeta.
        //
        // Con el ancho arreglado, la linea larga se deja pasar a una SEGUNDA linea (line-clamp:2).
        // El tope de 2 no es arbitrario: la tarjeta tiene 140px fijos (clase height140 del POS), de
        // los que 124 son utiles, y el contenido ocupa 93. Con line-height 13 caben holgadamente
        // dos lineas largas; a partir de ahi el clamp corta con puntos suspensivos en vez de
        // desbordar. Medido: la direccion completa "---- CALLEJON GRANDE PARCELA NRO. REF ---- EX
        // FUNDO SANTA ROSA" se ve entera y el corte de la zona sigue en 0.
        // Alto 140 -> 148px. La tarjeta de direccion trae 140px fijos del POS (clase height140) y
        // acababa en y=744, mientras la caja de montos de al lado acaba en 752: las dos tarjetas de
        // abajo no cerraban a la misma altura. Con 148 (80 de la ficha + 148 = 228, el alto exacto
        // de la zona) cierran las dos en 752. Sigue sobrando sitio dentro: el contenido ocupa 93 de
        // los ~132 utiles.
        + "#CustomerPanel .sct-dom-card{height:148px !important;min-height:148px !important;max-height:148px !important;}\n"
        + "#CustomerPanel .sct-dom-card .col,#CustomerPanel .sct-dom-card .pad12{min-width:0 !important;}\n"
        + "#CustomerPanel .sct-dom-card .h4{line-height:13px !important;}\n"
        + "#CustomerPanel .sct-dom-card .h4.ellipsis{white-space:normal !important;display:-webkit-box !important;-webkit-box-orient:vertical !important;-webkit-line-clamp:2 !important;overflow:hidden !important;}\n"
        + ".sct-dom-card .sct-live-direccion{display:block !important;width:100% !important;max-width:100% !important;max-height:58px !important;margin:0 !important;padding:0 !important;overflow:hidden !important;overflow-wrap:anywhere !important;word-break:normal !important;white-space:normal !important;font-size:10px !important;line-height:1.1 !important;box-sizing:border-box !important;}\n"
        + ".sct-live-zona-cliente{height:228px !important;min-height:0 !important;max-height:228px !important;margin-top:0px !important;transform:translateY(-20px) !important;overflow:hidden !important;box-sizing:border-box !important;}\n"
        + ".sct-live-zona-montos{height:228px !important;min-height:0 !important;max-height:228px !important;margin-top:0px !important;overflow:hidden !important;box-sizing:border-box !important;}\n"
        // Ancho 312 -> 298. La caja de montos terminaba en x=648 y la columna derecha empieza en
        // x=650: quedaban 2px entre las dos, pegadas. Con 298 acaba en 634, que es donde acaba
        // ahora el carrito (ver propLineas en ThemeEngine.aplicarLayoutCompacto): las dos cajas de
        // la izquierda alineadas y 16px de aire hasta la columna derecha.
        // Los dos anchos van de la mano: si se cambia uno, se cambia el otro o se descuadran.
        + "#TotalsPanel{right:auto !important;width:298px !important;height:228px !important;min-height:0px !important;max-height:228px !important;transform:translateY(-20px) !important;box-sizing:border-box !important;overflow:hidden !important;}\n"
        + "#TotalsPanel .fields.row{width:100% !important;height:188px !important;min-height:188px !important;max-height:188px !important;}\n"
        + "#TotalsPanel .panel-footer{width:100% !important;height:40px !important;min-height:40px !important;max-height:40px !important;}\n"
        // Reparto vertical de la columna derecha (medido en vivo, ventana 1024x768):
        //   tarjeta de pestanas 178-508 | Boleta 520-614 | Metodos de pago 625-752 | fondo 768
        //
        // Los huecos entre bloques estaban en 8px, demasiado apretados, y sobraban 23px muertos al
        // final de la pantalla. Repartidos, quedan en 12 y 11px.
        //
        // El TOP ya no se fija: lo calcula acomodarColumnaDerecha() anclando esta tarjeta al inicio
        // de la caja de importes. Estaba en 460 (pintaba en y=520) y en master los importes
        // arrancan en 524, asi que quedaba descolgada. Aqui solo queda la posicion horizontal.
        + "#CustomControl1{position:absolute !important;left:630px !important;right:auto !important;width:340px !important;height:78px !important;min-height:0px !important;max-height:78px !important;transform:none !important;padding:6px 10px 7px !important;overflow:hidden !important;}\n"
        // BUG CORREGIDO (1024x768): esta regla aplicaba la MISMA posicion absoluta a tres
        // elementos ANIDADOS (#ButtonGrid4 > #ButtonGrid4Control > .buttonsContainer). Como cada
        // uno se posiciona respecto al anterior, los desplazamientos se SUMABAN
        // (630+630+630 / 644+644+644) y los tiles de pago acababan en x=1910, y=1961:
        // completamente fuera de la pantalla. Solo la ZONA exterior lleva left/top.
        // Sin top ni alto: los calcula acomodarColumnaDerecha() para que el bloque quede debajo de
        // la tarjeta de Boleta y acabe donde acaba #TotalsPanel. Estaban en top 565 y alto 127,
        // medidos contra UAT.
        + "#ButtonGrid4{position:absolute !important;left:630px !important;right:auto !important;width:340px !important;transform:none !important;}\n"
        + "#ButtonGrid4Control, #ButtonGrid4Control .buttonsContainer{position:absolute !important;left:0 !important;top:0 !important;right:auto !important;width:340px !important;transform:none !important;}\n"
        // El contenedor nativo del teclado mide 256px con overflow:hidden y recortaba la 4a
        // columna (Retroceso, Mas/Menos, Veces, abc), que llega hasta los 316px del bloque.
        + "#NumberPad, #NumberPad .numpad{width:316px !important;max-width:316px !important;}\n"
        // BUG CORREGIDO (1024x768) "botones entrecortados": la ZONA exterior que HQ dibuja
        // (#ButtonGridN, clase layoutControl) mide 300px y trae overflow:hidden, pero el control
        // interior lo ensanchamos a 316px. La zona recortaba los 16px de la derecha, que es
        // justo donde caen las esquinas redondeadas: los botones se veian cortados a la derecha
        // y redondeados solo a la izquierda. Se libera el recorte de la zona (los botones ya
        // quedan dentro de la tarjeta por posicionamiento propio).
        + "#ButtonGrid1, #ButtonGrid2, #ButtonGrid3{overflow:visible !important;}\n"
        // SIN GEOMETRIA, igual que en el bloque amplio: la rejilla de HQ coloca los botones.
        + ".sct-cbtn{color:#FFFFFF !important;background-image:none !important;}\n"
        + ".sct-cbtn-primary{background-color:#C8102E !important;}\n"
        + ".sct-cbtn-dark{background-color:#1B1A19 !important;}\n"
        + ".sct-tbtn{color:#FFFFFF !important;background-image:none !important;background-color:#1B1A19 !important;}\n"
        + ".sct-tbtn.sct-t5{background-color:#C8102E !important;}\n"
        + ".sct-bbtn{background-color:#1B1A19 !important;color:#FFFFFF !important;background-image:none !important;}\n"
        // Sin posiciones: la rejilla del POS ya reparte los botones. Ver el comentario equivalente
        // en el bloque amplio. Aqui solo se ajusta la tipografia del rotulo al tamano compacto.;

    return acotar(cssBase, "body." + CLASE_AMBITO)
         + "@media screen and (min-width: 1367px) {\n" + acotar(cssAmplio, "body." + CLASE_AMBITO) + "}\n"
         + "@media screen and (max-width: 1366px) {\n" + acotar(cssCompacto, "body." + CLASE_AMBITO) + "}\n";
}
