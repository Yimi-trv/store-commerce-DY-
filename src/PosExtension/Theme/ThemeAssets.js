System.register([], function (exports_1, context_1) {
    "use strict";
    var TEMA_ACTIVO, CLASE_AMBITO, CLASE_AMPLIO, CLASE_COMPACTO, ROJO, ROJO_CALIDO, FONDO_TARJETA, BORDE_TARJETA, RECIBO, ICONOS, LOGO_NIUBIZ;
    var __moduleName = context_1 && context_1.id;
    function acotar(css, raiz) {
        var salida = "";
        var bloques = css.split("}");
        for (var i = 0; i < bloques.length; i++) {
            var bloque = bloques[i];
            var corte = bloque.indexOf("{");
            if (corte < 0)
                continue;
            var selectores = bloque.substring(0, corte).split(",");
            var cuerpo = bloque.substring(corte);
            var acotados = [];
            for (var j = 0; j < selectores.length; j++) {
                var selector = selectores[j].replace(/^\s+|\s+$/g, "");
                if (selector.length === 0)
                    continue;
                if (selector.indexOf(".dark ") === 0) {
                    acotados.push(raiz + ".dark " + selector.substring(6));
                }
                else {
                    acotados.push(raiz + " " + selector);
                }
            }
            if (acotados.length > 0) {
                salida += acotados.join(",") + cuerpo + "}\n";
            }
        }
        return salida;
    }
    function svg(body, strokeWidth) {
        var head = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='" + strokeWidth + "' stroke-linecap='round' stroke-linejoin='round'>";
        return "url(\"data:image/svg+xml," + encodeURIComponent(head + body + "</svg>") + "\")";
    }
    function aspaRoja(cx, cy) {
        return "<circle cx='" + cx + "' cy='" + cy + "' r='4.6' stroke='" + ROJO_CALIDO + "'/><path d='M" + (cx - 1.7) + " " + (cy - 1.7) + "l3.4 3.4M" + (cx + 1.7) + " " + (cy - 1.7) + "l-3.4 3.4' stroke='" + ROJO_CALIDO + "'/>";
    }
    function construirCss() {
        var reglasIconos = "";
        for (var clave in ICONOS) {
            if (ICONOS.hasOwnProperty(clave)) {
                reglasIconos += ".sct-ic-" + clave + "{background-image:" + ICONOS[clave] + ";}\n";
            }
        }
        var cssBase = ""
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
            + ".sct-ic{position:absolute;background-repeat:no-repeat;background-position:center;background-size:contain;pointer-events:none;}\n"
            + ".sct-cbtn .sct-ic{left:28px;top:50%;transform:translateY(-50%);width:46px;height:46px;}\n"
            + ".sct-tbtn .sct-ic{left:50%;top:20px;transform:translateX(-50%);width:60px;height:60px;}\n"
            + ".sct-bbtn .sct-ic{left:26px;top:50%;transform:translateY(-50%);width:66px;height:66px;}\n"
            + "#ButtonGrid4Control .sct-pbtn .sct-ic{left:50%;top:7px;transform:translateX(-50%);width:32px;height:32px;}\n"
            + reglasIconos
            + ".sct-cbtn{position:absolute !important;border-radius:12px !important;overflow:hidden !important;background-image:none !important;}\n"
            + ".sct-cbtn::after{content:'';position:absolute;left:96px;top:18%;height:64%;width:1px;background:rgba(255,255,255,0.45);}\n"
            + ".sct-cbtn > div{position:absolute !important;left:120px !important;right:12px !important;top:50% !important;bottom:auto !important;transform:translateY(-50%) !important;text-align:left !important;}\n"
            + ".sct-cbtn > div *{font-size:19px !important;font-weight:400 !important;color:#FFF !important;line-height:1.2 !important;}\n"
            + ".sct-cbtn-primary{background-color:" + ROJO + " !important;border:none !important;}\n"
            + ".sct-cbtn-primary::after{background:rgba(255,255,255,0.55);}\n"
            + ".sct-cbtn-dark{background-color:#1B1A19 !important;border:1px solid rgba(255,255,255,0.14) !important;border-left:4px solid " + ROJO + " !important;}\n"
            + ".sct-tbtn{position:absolute !important;border-radius:12px !important;overflow:hidden !important;background-image:none !important;}\n"
            + ".sct-tbtn-dark{background-color:#1B1A19 !important;border:1px solid rgba(255,255,255,0.16) !important;}\n"
            + ".sct-tbtn-outline{background-color:#1B1A19 !important;border:1.5px solid " + ROJO + " !important;}\n"
            + ".sct-tbtn-fill{background-color:" + ROJO + " !important;border:1.5px solid " + ROJO + " !important;}\n"
            + ".sct-tbtn::after{white-space:pre-line;position:absolute;left:6px;right:6px;top:96px;text-align:center;color:#FFF;font-size:17px;line-height:1.3;}\n"
            + ".sct-t1::after{content:'Anular\\A Pago';}\n"
            + ".sct-t2::after{content:'Anular\\A Producto';}\n"
            + ".sct-t3::after{content:'Definir\\A Cantidad';}\n"
            + ".sct-t4::after{content:'Cancelar\\A Transacción';}\n"
            + ".sct-t5::after{content:'Volver a\\A Transacción';}\n"
            + ".sct-t6::after{content:'Suspender\\A Transacción';}\n"
            + ".sct-bbtn{position:absolute !important;border-radius:12px !important;background-color:#1B1A19 !important;border:1px solid rgba(255,255,255,0.14) !important;border-left:4px solid " + ROJO + " !important;overflow:hidden !important;background-image:none !important;}\n"
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
        var cssAmplio = ""
            + ".dark .commerceTabControl.righttabs{flex-direction:column !important;height:468px !important;}\n"
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
            + ".dark .transactionLinesPane{border:" + BORDE_TARJETA + " !important;border-radius:14px !important;padding:2px 8px !important;box-sizing:border-box !important;}\n";
        var cssCompacto = ""
            + "#TabControl, #TabControl .commerceTabControl.righttabs{width:452px !important;box-sizing:border-box !important;}\n"
            + "#TabControl{pointer-events:none !important;}\n"
            + "#TabControl .commerceTabControl.righttabs{height:400px !important;overflow:visible !important;}\n"
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
            + "#TabControl .numpad-control{width:316px !important;height:auto !important;margin:0 auto !important;transform:translateX(-12px) !important;}\n"
            + "#TabControl .numpad-control-input-wrapper{width:316px !important;height:36px !important;min-height:36px !important;margin-left:auto !important;margin-right:auto !important;}\n"
            + "#TabControl .numpad-control-buttons{width:316px !important;height:auto !important;margin:8px auto 0 auto !important;transform:none !important;}\n"
            + "#TabControl .numpad-control-buttons button{background-color:rgba(255,255,255,0.13) !important;color:#FFF !important;border:1px solid rgba(255,255,255,0.18) !important;height:44px !important;min-height:44px !important;max-height:44px !important;font-size:28px !important;border-radius:8px !important;}\n"
            + "#TabControl .numpad-control-buttons button *{font-size:28px !important;}\n"
            + "#TabControl .numpad-control-buttons button[aria-label='Habilitar edición de texto'],#TabControl .numpad-control-buttons button[aria-label='Habilitar edición de texto'] *{font-size:16px !important;}\n"
            + "#TabControl .numpad-control-buttons button[aria-label='Más/Menos'],#TabControl .numpad-control-buttons button[aria-label='Más/Menos'] *,#TabControl .numpad-control-buttons button[aria-label='Veces'],#TabControl .numpad-control-buttons button[aria-label='Veces'] *{font-size:21px !important;}\n"
            + "#TabControl .numpad-control-buttons .enter{width:316px !important;height:44px !important;min-height:44px !important;max-height:44px !important;background-color:#A81020 !important;color:#FFF !important;border:none !important;}\n"
            + "#TabControl .numpad-control-label{color:#A19F9D !important;font-size:12px !important;font-style:italic !important;margin-bottom:3px !important;}\n"
            + "#ButtonGrid1Control .sct-cbtn .sct-ic{left:18px !important;width:36px !important;height:36px !important;}\n"
            + "#ButtonGrid1Control .sct-cbtn::after{left:70px !important;}\n"
            + "#ButtonGrid1Control .sct-cbtn > div{left:88px !important;right:8px !important;}\n"
            + "#ButtonGrid1Control .sct-cbtn > div *{font-size:15px !important;}\n"
            + "#ButtonGrid2Control .sct-tbtn .sct-ic{width:44px !important;height:44px !important;top:14px !important;}\n"
            + "#ButtonGrid2Control .sct-tbtn::after{top:68px !important;font-size:13px !important;line-height:1.15 !important;}\n"
            + "#ButtonGrid3Control .sct-bbtn .sct-ic{left:18px !important;width:46px !important;height:46px !important;}\n"
            + "#ButtonGrid3Control .sct-bbtn::after{left:80px !important;}\n"
            + "#ButtonGrid3Control .sct-bbtn > div:first-of-type{left:96px !important;right:10px !important;}\n"
            + "#ButtonGrid3Control .sct-b-t{font-size:16px !important;}\n"
            + "#ButtonGrid3Control .sct-b-s{font-size:12px !important;}\n"
            + "#CustomControl1{width:340px !important;height:94px !important;min-height:0 !important;max-height:94px !important;padding:6px 10px 7px !important;box-sizing:border-box !important;overflow:hidden !important;border:1px solid rgba(255,255,255,0.12) !important;border-radius:14px !important;background:rgba(22,21,20,0.6) !important;}\n"
            + "#CustomControl1 select{width:100% !important;height:24px !important;min-height:24px !important;font-size:11px !important;}\n"
            + "#CustomControl1 #btnToggle{width:100% !important;height:26px !important;min-height:26px !important;max-height:26px !important;font-size:11px !important;line-height:1 !important;}\n"
            + "#ButtonGrid4, #ButtonGrid4Control, #ButtonGrid4Control .buttonsContainer{width:340px !important;height:127px !important;min-height:0 !important;max-height:127px !important;overflow:hidden !important;padding:0 !important;}\n"
            + "#ButtonGrid4Control .sct-pbtn{border-radius:9px !important;}\n"
            + "#ButtonGrid4Control .sct-pbtn .sct-ic{width:25px !important;height:25px !important;top:4px !important;}\n"
            + "#ButtonGrid4Control .sct-pbtn::after{left:2px !important;right:2px !important;bottom:4px !important;font-size:9px !important;line-height:1.05 !important;}\n"
            + "#ButtonGrid4Control .sct-p4::after{font-size:8.5px !important;}\n"
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
            + ".sct-dom-card{overflow:hidden !important;}\n"
            + ".sct-dom-card .sct-live-direccion{display:block !important;width:100% !important;max-width:100% !important;max-height:58px !important;margin:0 !important;padding:0 !important;overflow:hidden !important;overflow-wrap:anywhere !important;word-break:normal !important;white-space:normal !important;font-size:10px !important;line-height:1.1 !important;box-sizing:border-box !important;}\n";
        return acotar(cssBase, "body." + CLASE_AMBITO)
            + acotar(cssAmplio, "body." + CLASE_AMBITO + "." + CLASE_AMPLIO)
            + acotar(cssCompacto, "body." + CLASE_AMBITO + "." + CLASE_COMPACTO);
    }
    exports_1("construirCss", construirCss);
    return {
        setters: [],
        execute: function () {
            exports_1("TEMA_ACTIVO", TEMA_ACTIVO = true);
            exports_1("CLASE_AMBITO", CLASE_AMBITO = "sct-on");
            exports_1("CLASE_AMPLIO", CLASE_AMPLIO = "sct-amplio");
            exports_1("CLASE_COMPACTO", CLASE_COMPACTO = "sct-compacto");
            ROJO = "#C8102E";
            ROJO_CALIDO = "#E8442C";
            FONDO_TARJETA = "rgba(22,21,20,0.6)";
            BORDE_TARJETA = "1px solid rgba(255,255,255,0.12)";
            RECIBO = "<path d='M3.5 2.5h11v15l-1.8-1.2-1.8 1.2-1.8-1.2-1.8 1.2-1.8-1.2-2 1.2z'/><path d='M6 6.5h6M6 9.5h4.5M6 12.5h3.5'/>";
            exports_1("ICONOS", ICONOS = {
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
            });
            exports_1("LOGO_NIUBIZ", LOGO_NIUBIZ = "url(\"data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 158 40' fill='none' stroke='white' stroke-width='8' stroke-linecap='round' stroke-linejoin='round'><path d='M6 32V22a10 10 0 0 1 20 0v10'/><path d='M38 32V12'/><path d='M50 12v10a10 10 0 0 0 20 0V12'/><path d='M82 32V6'/><circle cx='92' cy='22' r='10'/><path d='M114 32V12'/><path d='M124 12h18l-18 20h18'/><circle cx='150' cy='14' r='3.6' fill='#00AEEF' stroke='none'/><circle cx='150' cy='30' r='3.6' fill='#00AEEF' stroke='none'/></svg>") + "\")");
        }
    };
});
