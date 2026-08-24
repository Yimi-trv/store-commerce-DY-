System.register(["PosApi/Consume/Customer", "PosApi/Consume/Cart"], function (exports_1, context_1) {
    "use strict";
    var Customer_1, Cart_1, GUARD_KEY, PROGRAMMATIC_KEY;
    var __moduleName = context_1 && context_1.id;
    function esVistaDeVenta() {
        if (typeof document === "undefined") {
            return true;
        }
        return !!document.querySelector("#ButtonGrid4Control")
            && !!document.querySelector(".transactionLinesPane");
    }
    exports_1("esVistaDeVenta", esVistaDeVenta);
    function searchAndAssignCustomer(context, searchText) {
        var correlationId = context && context.logger && context.logger.getNewCorrelationId
            ? context.logger.getNewCorrelationId()
            : "customer-inline-search";
        window[PROGRAMMATIC_KEY] = true;
        var release = function (result) {
            window[PROGRAMMATIC_KEY] = false;
            window[GUARD_KEY] = false;
            return result;
        };
        return context.runtime
            .executeAsync(new Customer_1.SelectCustomerClientRequest(correlationId, searchText))
            .then(function (response) {
            var selected = response && response.data && response.data.result;
            var accountNumber = (selected && selected.AccountNumber) || "";
            if (response && response.canceled) {
                return Promise.resolve(release({ canceled: true }));
            }
            if (!accountNumber) {
                context.logger.logError("searchAndAssignCustomer: la selección no devolvió AccountNumber.");
                return Promise.resolve(release({ canceled: true }));
            }
            return context.runtime
                .executeAsync(new Cart_1.SetCustomerOnCartOperationRequest(correlationId, accountNumber))
                .then(function () { return release({ canceled: true }); });
        })
            .catch(function (reason) {
            context.logger.logError("searchAndAssignCustomer error: " + safeStringify(reason));
            return release({ canceled: true });
        });
    }
    exports_1("searchAndAssignCustomer", searchAndAssignCustomer);
    function safeStringify(value) {
        try {
            return JSON.stringify(value);
        }
        catch (error) {
            return value ? value.toString() : "";
        }
    }
    return {
        setters: [
            function (Customer_1_1) {
                Customer_1 = Customer_1_1;
            },
            function (Cart_1_1) {
                Cart_1 = Cart_1_1;
            }
        ],
        execute: function () {
            exports_1("GUARD_KEY", GUARD_KEY = "__customerInlineDialogActive");
            exports_1("PROGRAMMATIC_KEY", PROGRAMMATIC_KEY = "__customerSearchProgrammatic");
        }
    };
});
