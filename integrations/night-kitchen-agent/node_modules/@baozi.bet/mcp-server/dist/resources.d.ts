export declare const RESOURCES: {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
}[];
export declare function handleResource(uri: string): Promise<{
    contents: Array<{
        uri: string;
        mimeType: string;
        text: string;
    }>;
}>;
