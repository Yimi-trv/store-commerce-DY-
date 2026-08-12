// c:\__w\1\s\src\pos\featureverticals\payments\src\contracts\public\getgiftcardbyidservicerequest.d.ts

export declare class GetGiftCardByIdServiceRequest<TResponse extends GetGiftCardByIdServiceResponse> extends Commerce.ServiceRequest<TResponse> {
    readonly giftCardId: string;
    constructor(correlationId: string, giftCardId: string);
}

// c:\__w\1\s\src\pos\featureverticals\payments\src\contracts\public\getgiftcardbyidserviceresponse.d.ts
export declare class GetGiftCardByIdServiceResponse extends Commerce.ServiceResponse {
    readonly giftCard: Commerce.Proxy.Entities.GiftCard;
    constructor(giftCard: Commerce.Proxy.Entities.GiftCard);
}

// c:\__w\1\s\src\pos\featureverticals\payments\src\contracts\public\getpaymentcardtypebybinrangeclientrequest.d.ts

export declare class GetPaymentCardTypeByBinRangeClientRequest<TResponse extends GetPaymentCardTypeByBinRangeClientResponse> extends Commerce.Request<TResponse> {
    readonly paymentCardNumber: string;
    readonly isSwipe: boolean;
    readonly cardInfo: Commerce.Client.Entities.ICardInfo;
    readonly extensionTransactionProperties?: Commerce.Client.Entities.IExtensionTransaction;
    readonly paymentInfo?: Commerce.Client.Entities.IPaymentInfo;
    constructor(paymentCardNumber: string, isSwipe: boolean, cardInfo: Commerce.Client.Entities.ICardInfo, extensionTransactionProperties?: Commerce.Client.Entities.IExtensionTransaction, correlationId?: string, paymentInfo?: Commerce.Client.Entities.IPaymentInfo);
}

// c:\__w\1\s\src\pos\featureverticals\payments\src\contracts\public\getpaymentcardtypebybinrangeclientresponse.d.ts
export declare class GetPaymentCardTypeByBinRangeClientResponse extends Commerce.ClientResponse<Commerce.Proxy.Entities.CardTypeInfo[]> {
}

// c:\__w\1\s\src\pos\featureverticals\payments\src\contracts\public\getsignatureclientrequest.d.ts

export declare class GetSignatureClientRequest<TResponse extends GetSignatureClientResponse> extends Commerce.ClientRequest<TResponse> {
    constructor(correlationId: string);
}

// c:\__w\1\s\src\pos\featureverticals\payments\src\contracts\public\getsignatureclientresponse.d.ts
export declare class GetSignatureClientResponse extends Commerce.ClientResponse<string> {
}

export as namespace CommercePosPayments
