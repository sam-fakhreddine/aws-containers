/**
 * URL parameter validation utilities
 * Provides functions for validating and sanitizing URL search parameters
 */

import { OpenerParamsSchema, ParameterValidator, GlobalValidator } from "../types";

/**
 * Checks if a value is empty (null, undefined, or empty string)
 * @param v - The value to check
 * @returns True if the value is empty
 */
function isEmpty(v: string | null | undefined): boolean {
    return v === null || v === undefined || v === "";
}

/**
 * Sanitizes and validates URL search parameters according to a schema
 * @param qs - URLSearchParams to validate
 * @param schema - Validation schema to apply
 * @returns Validated parameters object
 */
export function sanitizeURLSearchParams(
    qs: URLSearchParams,
    schema: OpenerParamsSchema,
): Record<string, unknown> {
    let params: Record<string, unknown> = {};

    // validate each key from the schema
    // except the __validators one
    for (let k of Object.keys(schema)) {
        if (k === "__validators") {
            continue;
        }

        // apply each validator
        let param: string | null | undefined = qs.get(k);
        const validators = (schema as unknown as Record<string, ParameterValidator[]>)[k];
        if (validators) {
            for (let v of validators) {
                param = v(param, k) as string | null | undefined;
            }
        }

        // skip empty params
        if (isEmpty(param)) {
            continue;
        }

        params[k] = param;
    }

    // apply global validators
    for (let v of schema.__validators || []) {
        params = v(params);
    }

    return params;
}

/**
 * Validates and normalizes a URL parameter
 * Attempts to add https:// prefix if URL parsing fails
 * Only allows HTTP and HTTPS protocols for security
 * @param p - The URL string to validate
 * @returns The validated URL string
 * @throws Error if URL is invalid or uses dangerous protocol
 */
export function url(p: string | null | undefined): string | null | undefined {
    if (isEmpty(p)) {
        return p;
    }

    if (!p) return p;

    let urlObj: URL;

    try {
        urlObj = new URL(p);

        // Security: Only allow http and https protocols
        // If protocol is not allowed, try adding https:// prefix
        const allowedProtocols = ['http:', 'https:'];
        if (!allowedProtocols.includes(urlObj.protocol)) {
            // Try adding https:// prefix for cases like "localhost:3000"
            try {
                urlObj = new URL("https://" + p);
            } catch {
                throw new Error(`URL protocol "${urlObj.protocol}" is not allowed. Only HTTP and HTTPS are permitted.`);
            }
        }
    } catch {
        // If first parse fails, try adding https:// prefix
        try {
            urlObj = new URL("https://" + p);
        } catch {
            throw new Error(`Invalid URL: ${p}`);
        }
    }

    return urlObj.toString();
}

/**
 * Validates that a required parameter is present
 * @param p - The parameter value
 * @param name - The parameter name (for error messages)
 * @returns The parameter value if present
 * @throws Error if parameter is missing
 */
export function required(p: string | null | undefined, name?: string): string {
    if (isEmpty(p)) {
        throw new Error(`"${name}" parameter is missing`);
    }
    return p!;
}

/**
 * Validates and converts a parameter to an integer
 * @param p - The parameter value
 * @param name - The parameter name (for error messages)
 * @returns The integer value or the original if empty
 * @throws Error if parameter is not a valid integer
 */
export function integer(p: string | null | undefined, name?: string): number | string | null | undefined {
    if (isEmpty(p)) {
        return p;
    }

    if (!p || !/^[-+]?(\d+|Infinity)$/.test(p)) {
        throw new Error(`"${name}" parameter should be an integer`);
    }

    return Number(p);
}

/**
 * Validates and converts a parameter to a boolean
 * Accepts: true/false, yes/no, on/off, 1/0 (case-insensitive)
 * @param p - The parameter value
 * @param name - The parameter name (for error messages)
 * @returns The boolean value or the original if empty
 * @throws Error if parameter is not a valid boolean
 */
export function boolean(p: string | null | undefined, name?: string): boolean | string | null | undefined {
    if (isEmpty(p)) {
        return p;
    }

    if (!p) return p;

    switch (p.toLowerCase()) {
        case "true":
        case "yes":
        case "on":
        case "1":
            return true;
        case "false":
        case "no":
        case "off":
        case "0":
            return false;
    }

    throw new Error(
        `"${name}" parameter should be a boolean (true/false, yes/no, on/off, 1/0)`,
    );
}

/**
 * Creates a validator that provides a fallback value for empty parameters
 * @param val - The fallback value
 * @returns A validator function
 */
export function fallback(val: unknown): ParameterValidator {
    return function (p: string | null | undefined): unknown {
        if (isEmpty(p)) {
            return val;
        }

        return p;
    };
}

/**
 * Creates a validator that checks if a parameter is in a list of allowed values
 * @param vals - Array of allowed values
 * @returns A validator function
 * @throws Error if parameter is not in the allowed list
 */
export function oneOf(vals: string[]): ParameterValidator {
    return function (p: string | null | undefined, name?: string): string | null | undefined {
        if (!p || vals.indexOf(p) === -1) {
            throw new Error(
                `"${name}" parameter should be in a list ${vals}`,
            );
        }

        return p;
    };
}

/**
 * Creates a validator that checks if a parameter is in a list of allowed values or empty
 * @param vals - Array of allowed values
 * @returns A validator function
 */
export function oneOfOrEmpty(vals: string[]): ParameterValidator {
    const oneOfFunc = oneOf(vals);
    return function (p: string | null | undefined, name?: string): string | null | undefined {
        if (isEmpty(p)) {
            return p;
        }

        return oneOfFunc(p, name) as string | null | undefined;
    };
}

/**
 * Creates a global validator that requires at least one of the specified parameters
 * @param requiredParams - Array of parameter names
 * @returns A validator function
 * @throws Error if none of the required parameters are present
 */
export function atLeastOneRequired(
    requiredParams: string[],
): GlobalValidator {
    return function (params: Record<string, unknown>): Record<string, unknown> {
        let valid = false;
        for (let p of requiredParams) {
            if (!isEmpty(params[p] as string | null | undefined)) {
                valid = true;
                break;
            }
        }

        if (!valid) {
            throw new Error(
                `at least one of "${requiredParams.join(
                    '", "',
                )}" should be specified`,
            );
        }

        return params;
    };
}
