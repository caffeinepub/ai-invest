import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface Query {
    suggestions: Array<Asset>;
    timestamp: Time;
    budget: number;
    riskLevel: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Asset {
    ticker: string;
    name: string;
    rupeeAmount: number;
    allocation: number;
    riskScore: bigint;
    reason: string;
}
export interface PortfolioEntry {
    id: bigint;
    stockName: string;
    addedAt: Time;
    buyPrice: number;
    quantity: number;
}
export interface UserProfile {
    name: string;
}
export interface http_header {
    value: string;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addInvestment(stockName: string, quantity: number, buyPrice: number): Promise<PortfolioEntry>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearManualPrice(ticker: string): Promise<void>;
    clearQueryHistory(): Promise<boolean>;
    deleteInvestment(id: bigint): Promise<boolean>;
    deleteQuery(timestamp: Time): Promise<boolean>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getInvestmentSuggestions(budget: number, riskLevel: string): Promise<Array<Asset>>;
    getInvestments(): Promise<Array<PortfolioEntry>>;
    getManualPrice(ticker: string): Promise<number | null>;
    getQueries(numQueries: bigint): Promise<Array<Query>>;
    getQueryHistory(): Promise<Array<Query>>;
    getStockPrice(ticker: string): Promise<number>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveManualPrice(ticker: string, price: number): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
