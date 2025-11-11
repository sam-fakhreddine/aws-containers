/**
 * Comprehensive tests for validator utilities
 * Following patterns from Python tests: extensive mocking, edge cases, clear naming
 */

import {
    sanitizeURLSearchParams,
    url,
    required,
    integer,
    boolean,
    fallback,
    oneOf,
    oneOfOrEmpty,
    atLeastOneRequired,
} from "./validator";
import { OpenerParamsSchema } from "../types";

describe("url validator", () => {
    /**
     * Test that valid URLs are returned unchanged
     */
    it("should return valid URL unchanged", () => {
        const validUrl = "https://example.com/path";
        expect(url(validUrl)).toBe(validUrl);
    });

    /**
     * Test that URLs without protocol get https:// prefix
     */
    it("should add https prefix to URL without protocol", () => {
        const result = url("example.com");
        expect(result).toBe("https://example.com/");
    });

    /**
     * Test that complex URLs are handled correctly
     */
    it("should handle complex URLs with query parameters", () => {
        const complexUrl = "https://example.com/path?query=value&foo=bar";
        expect(url(complexUrl)).toBe(complexUrl);
    });

    /**
     * Test that URLs with ports are handled correctly
     */
    it("should handle URLs with custom ports", () => {
        const urlWithPort = "https://example.com:8080/path";
        expect(url(urlWithPort)).toBe(urlWithPort);
    });

    /**
     * Test that empty values are returned as-is
     */
    it("should return empty string unchanged", () => {
        expect(url("")).toBe("");
    });

    /**
     * Test that null values are returned as-is
     */
    it("should return null unchanged", () => {
        expect(url(null as any)).toBe(null);
    });

    /**
     * Test that undefined values are returned as-is
     */
    it("should return undefined unchanged", () => {
        expect(url(undefined as any)).toBe(undefined);
    });

    /**
     * Test that invalid URLs throw errors
     */
    it("should throw error for completely invalid URL", () => {
        expect(() => url("not a valid url at all!!!")).toThrow();
    });

    /**
     * Test localhost URLs
     */
    it("should handle localhost URLs", () => {
        const result = url("localhost:3000");
        // localhost:3000 is not a valid URL without protocol, but the function
        // catches the error and tries again with https prefix, which succeeds
        expect(result).toContain("localhost");
    });
});

describe("required validator", () => {
    /**
     * Test that non-empty values pass validation
     */
    it("should return value if present", () => {
        expect(required("test", "param")).toBe("test");
    });

    /**
     * Test that numeric values pass validation
     */
    it("should return numeric values", () => {
        expect(required(123, "param")).toBe(123);
    });

    /**
     * Test that boolean values pass validation
     */
    it("should return boolean values", () => {
        expect(required(true, "param")).toBe(true);
        expect(required(false, "param")).toBe(false);
    });

    /**
     * Test that empty string throws error
     */
    it("should throw error for empty string", () => {
        expect(() => required("", "fieldName")).toThrow('"fieldName" parameter is missing');
    });

    /**
     * Test that null throws error
     */
    it("should throw error for null", () => {
        expect(() => required(null, "fieldName")).toThrow('"fieldName" parameter is missing');
    });

    /**
     * Test that undefined throws error
     */
    it("should throw error for undefined", () => {
        expect(() => required(undefined, "fieldName")).toThrow('"fieldName" parameter is missing');
    });

    /**
     * Test that error message includes parameter name
     */
    it("should include parameter name in error message", () => {
        expect(() => required(null, "customParam")).toThrow('"customParam" parameter is missing');
    });
});

describe("integer validator", () => {
    /**
     * Test that valid integers are parsed correctly
     */
    it("should parse valid positive integer", () => {
        expect(integer("123", "count")).toBe(123);
    });

    /**
     * Test that negative integers are parsed correctly
     */
    it("should parse negative integer", () => {
        expect(integer("-456", "count")).toBe(-456);
    });

    /**
     * Test that zero is handled correctly
     */
    it("should parse zero", () => {
        expect(integer("0", "count")).toBe(0);
    });

    /**
     * Test that integers with plus sign are parsed
     */
    it("should parse integer with plus sign", () => {
        expect(integer("+789", "count")).toBe(789);
    });

    /**
     * Test that Infinity is handled
     */
    it("should parse Infinity", () => {
        expect(integer("Infinity", "count")).toBe(Infinity);
    });

    /**
     * Test that empty values are returned unchanged
     */
    it("should return empty string unchanged", () => {
        expect(integer("", "count")).toBe("");
    });

    /**
     * Test that null is returned unchanged
     */
    it("should return null unchanged", () => {
        expect(integer(null as any, "count")).toBe(null);
    });

    /**
     * Test that decimal numbers throw error
     */
    it("should throw error for decimal number", () => {
        expect(() => integer("12.34", "count")).toThrow('"count" parameter should be an integer');
    });

    /**
     * Test that non-numeric strings throw error
     */
    it("should throw error for non-numeric string", () => {
        expect(() => integer("abc", "count")).toThrow('"count" parameter should be an integer');
    });

    /**
     * Test that strings with spaces throw error
     */
    it("should throw error for string with spaces", () => {
        expect(() => integer("12 34", "count")).toThrow('"count" parameter should be an integer');
    });
});

describe("boolean validator", () => {
    /**
     * Test that "true" values are parsed correctly
     */
    it("should parse 'true' as true", () => {
        expect(boolean("true", "flag")).toBe(true);
    });

    /**
     * Test that "false" values are parsed correctly
     */
    it("should parse 'false' as false", () => {
        expect(boolean("false", "flag")).toBe(false);
    });

    /**
     * Test that "yes" is parsed as true
     */
    it("should parse 'yes' as true", () => {
        expect(boolean("yes", "flag")).toBe(true);
    });

    /**
     * Test that "no" is parsed as false
     */
    it("should parse 'no' as false", () => {
        expect(boolean("no", "flag")).toBe(false);
    });

    /**
     * Test that "on" is parsed as true
     */
    it("should parse 'on' as true", () => {
        expect(boolean("on", "flag")).toBe(true);
    });

    /**
     * Test that "off" is parsed as false
     */
    it("should parse 'off' as false", () => {
        expect(boolean("off", "flag")).toBe(false);
    });

    /**
     * Test that "1" is parsed as true
     */
    it("should parse '1' as true", () => {
        expect(boolean("1", "flag")).toBe(true);
    });

    /**
     * Test that "0" is parsed as false
     */
    it("should parse '0' as false", () => {
        expect(boolean("0", "flag")).toBe(false);
    });

    /**
     * Test case insensitivity for "TRUE"
     */
    it("should be case insensitive for TRUE", () => {
        expect(boolean("TRUE", "flag")).toBe(true);
    });

    /**
     * Test case insensitivity for "False"
     */
    it("should be case insensitive for False", () => {
        expect(boolean("False", "flag")).toBe(false);
    });

    /**
     * Test case insensitivity for "YES"
     */
    it("should be case insensitive for YES", () => {
        expect(boolean("YES", "flag")).toBe(true);
    });

    /**
     * Test that empty values are returned unchanged
     */
    it("should return empty string unchanged", () => {
        expect(boolean("", "flag")).toBe("");
    });

    /**
     * Test that null is returned unchanged
     */
    it("should return null unchanged", () => {
        expect(boolean(null as any, "flag")).toBe(null);
    });

    /**
     * Test that invalid boolean strings throw error
     */
    it("should throw error for invalid boolean string", () => {
        expect(() => boolean("maybe", "flag")).toThrow(
            '"flag" parameter should be a boolean (true/false, yes/no, on/off, 1/0)'
        );
    });

    /**
     * Test that numbers other than 0 and 1 throw error
     */
    it("should throw error for number 2", () => {
        expect(() => boolean("2", "flag")).toThrow();
    });
});

describe("fallback validator", () => {
    /**
     * Test that non-empty values are returned unchanged
     */
    it("should return value if present", () => {
        const validator = fallback("default");
        expect(validator("actual")).toBe("actual");
    });

    /**
     * Test that empty string triggers fallback
     */
    it("should return fallback for empty string", () => {
        const validator = fallback("default");
        expect(validator("")).toBe("default");
    });

    /**
     * Test that null triggers fallback
     */
    it("should return fallback for null", () => {
        const validator = fallback("default");
        expect(validator(null)).toBe("default");
    });

    /**
     * Test that undefined triggers fallback
     */
    it("should return fallback for undefined", () => {
        const validator = fallback("default");
        expect(validator(undefined)).toBe("default");
    });

    /**
     * Test that numeric fallback values work
     */
    it("should work with numeric fallback", () => {
        const validator = fallback(42);
        expect(validator(null)).toBe(42);
    });

    /**
     * Test that boolean fallback values work
     */
    it("should work with boolean fallback", () => {
        const validator = fallback(true);
        expect(validator(undefined)).toBe(true);
    });

    /**
     * Test that zero is not treated as empty
     */
    it("should not use fallback for zero", () => {
        const validator = fallback(99);
        expect(validator(0 as any)).toBe(0);
    });

    /**
     * Test that false is not treated as empty
     */
    it("should not use fallback for false", () => {
        const validator = fallback(true);
        expect(validator(false as any)).toBe(false);
    });
});

describe("oneOf validator", () => {
    /**
     * Test that valid values pass validation
     */
    it("should return value if in allowed list", () => {
        const validator = oneOf(["red", "green", "blue"]);
        expect(validator("red", "color")).toBe("red");
    });

    /**
     * Test that all allowed values are accepted
     */
    it("should accept all values in the list", () => {
        const validator = oneOf(["a", "b", "c"]);
        expect(validator("a", "option")).toBe("a");
        expect(validator("b", "option")).toBe("b");
        expect(validator("c", "option")).toBe("c");
    });

    /**
     * Test that numeric values work
     */
    it("should work with numeric values", () => {
        const validator = oneOf([1, 2, 3]);
        expect(validator(2 as any, "number")).toBe(2);
    });

    /**
     * Test that invalid values throw error
     */
    it("should throw error for value not in list", () => {
        const validator = oneOf(["red", "green", "blue"]);
        expect(() => validator("yellow", "color")).toThrow(
            '"color" parameter should be in a list red,green,blue'
        );
    });

    /**
     * Test that error message includes parameter name
     */
    it("should include parameter name in error message", () => {
        const validator = oneOf(["x", "y"]);
        expect(() => validator("z", "axis")).toThrow('"axis" parameter should be in a list');
    });

    /**
     * Test that empty list throws error for any value
     */
    it("should throw error for empty allowed list", () => {
        const validator = oneOf([]);
        expect(() => validator("anything", "param")).toThrow();
    });
});

describe("oneOfOrEmpty validator", () => {
    /**
     * Test that valid values pass validation
     */
    it("should return value if in allowed list", () => {
        const validator = oneOfOrEmpty(["red", "green", "blue"]);
        expect(validator("red", "color")).toBe("red");
    });

    /**
     * Test that empty string is allowed
     */
    it("should allow empty string", () => {
        const validator = oneOfOrEmpty(["red", "green", "blue"]);
        expect(validator("", "color")).toBe("");
    });

    /**
     * Test that null is allowed
     */
    it("should allow null", () => {
        const validator = oneOfOrEmpty(["red", "green", "blue"]);
        expect(validator(null, "color")).toBe(null);
    });

    /**
     * Test that undefined is allowed
     */
    it("should allow undefined", () => {
        const validator = oneOfOrEmpty(["red", "green", "blue"]);
        expect(validator(undefined, "color")).toBe(undefined);
    });

    /**
     * Test that invalid non-empty values throw error
     */
    it("should throw error for invalid non-empty value", () => {
        const validator = oneOfOrEmpty(["red", "green", "blue"]);
        expect(() => validator("yellow", "color")).toThrow();
    });
});

describe("atLeastOneRequired validator", () => {
    /**
     * Test that validation passes when first parameter is present
     */
    it("should pass when first parameter is present", () => {
        const validator = atLeastOneRequired(["name", "id"]);
        const params = { name: "test" };
        expect(validator(params)).toBe(params);
    });

    /**
     * Test that validation passes when second parameter is present
     */
    it("should pass when second parameter is present", () => {
        const validator = atLeastOneRequired(["name", "id"]);
        const params = { id: "123" };
        expect(validator(params)).toBe(params);
    });

    /**
     * Test that validation passes when both parameters are present
     */
    it("should pass when both parameters are present", () => {
        const validator = atLeastOneRequired(["name", "id"]);
        const params = { name: "test", id: "123" };
        expect(validator(params)).toBe(params);
    });

    /**
     * Test that validation passes when any of multiple parameters is present
     */
    it("should pass when any of multiple parameters is present", () => {
        const validator = atLeastOneRequired(["a", "b", "c"]);
        expect(validator({ b: "value" })).toEqual({ b: "value" });
    });

    /**
     * Test that validation fails when no parameters are present
     */
    it("should throw error when no parameters are present", () => {
        const validator = atLeastOneRequired(["name", "id"]);
        expect(() => validator({})).toThrow('at least one of "name", "id" should be specified');
    });

    /**
     * Test that validation fails when parameters are empty strings
     */
    it("should throw error when parameters are empty strings", () => {
        const validator = atLeastOneRequired(["name", "id"]);
        expect(() => validator({ name: "", id: "" })).toThrow();
    });

    /**
     * Test that validation fails when parameters are null
     */
    it("should throw error when parameters are null", () => {
        const validator = atLeastOneRequired(["name", "id"]);
        expect(() => validator({ name: null, id: null })).toThrow();
    });

    /**
     * Test that validation fails when parameters are undefined
     */
    it("should throw error when parameters are undefined", () => {
        const validator = atLeastOneRequired(["name", "id"]);
        expect(() => validator({ name: undefined, id: undefined })).toThrow();
    });

    /**
     * Test that zero is treated as a valid value
     */
    it("should pass when parameter is zero", () => {
        const validator = atLeastOneRequired(["count"]);
        expect(validator({ count: 0 })).toEqual({ count: 0 });
    });

    /**
     * Test that false is treated as a valid value
     */
    it("should pass when parameter is false", () => {
        const validator = atLeastOneRequired(["flag"]);
        expect(validator({ flag: false })).toEqual({ flag: false });
    });
});

describe("sanitizeURLSearchParams", () => {
    /**
     * Test basic parameter sanitization
     */
    it("should sanitize and validate simple parameters", () => {
        const schema = {
            signature: [],
            id: [],
            name: [(p: any, name: any) => required(p, name)],
            color: [],
            icon: [],
            url: [(p: any, name: any) => url(p)],
            index: [],
            pinned: [],
            openInReaderMode: [],
            __validators: [],
        } as unknown as OpenerParamsSchema;

        const params = new URLSearchParams("name=test&url=https://example.com");
        const result = sanitizeURLSearchParams(params, schema);

        expect(result).toEqual({
            name: "test",
            url: "https://example.com/",
        });
    });

    /**
     * Test that empty parameters are skipped
     */
    it("should skip empty parameters", () => {
        const schema: OpenerParamsSchema = {
            signature: [],
            id: [],
            name: [],
            color: [],
            icon: [],
            url: [],
            index: [],
            pinned: [],
            openInReaderMode: [],
            __validators: [],
        };

        const params = new URLSearchParams("name=test&color=&icon=");
        const result = sanitizeURLSearchParams(params, schema);

        expect(result).toEqual({ name: "test" });
    });

    /**
     * Test that __validators are not processed as regular parameters
     */
    it("should not process __validators as regular parameter", () => {
        const schema: OpenerParamsSchema = {
            signature: [],
            id: [],
            name: [],
            color: [],
            icon: [],
            url: [],
            index: [],
            pinned: [],
            openInReaderMode: [],
            __validators: [],
        };

        const params = new URLSearchParams("name=test&__validators=something");
        const result = sanitizeURLSearchParams(params, schema);

        expect(result).toEqual({ name: "test" });
        expect(result).not.toHaveProperty("__validators");
    });

    /**
     * Test that multiple validators are applied in sequence
     */
    it("should apply multiple validators in sequence", () => {
        const schema = {
            signature: [],
            id: [],
            name: [],
            color: [],
            icon: [],
            url: [(p: any, name: any) => required(p, name), (p: any, name: any) => url(p)],
            index: [],
            pinned: [],
            openInReaderMode: [],
            __validators: [],
        } as unknown as OpenerParamsSchema;

        const params = new URLSearchParams("url=example.com");
        const result = sanitizeURLSearchParams(params, schema);

        expect(result.url).toBe("https://example.com/");
    });

    /**
     * Test that global validators are applied
     */
    it("should apply global validators", () => {
        const mockValidator = jest.fn((params) => params);
        const schema: OpenerParamsSchema = {
            signature: [],
            id: [],
            name: [],
            color: [],
            icon: [],
            url: [],
            index: [],
            pinned: [],
            openInReaderMode: [],
            __validators: [mockValidator],
        };

        const params = new URLSearchParams("name=test");
        sanitizeURLSearchParams(params, schema);

        expect(mockValidator).toHaveBeenCalledWith({ name: "test" });
    });

    /**
     * Test that validation errors are propagated
     */
    it("should throw error from validator", () => {
        const schema = {
            signature: [],
            id: [],
            name: [(p: any, name: any) => required(p, name)],
            color: [],
            icon: [],
            url: [],
            index: [],
            pinned: [],
            openInReaderMode: [],
            __validators: [],
        } as unknown as OpenerParamsSchema;

        const params = new URLSearchParams("color=red");
        expect(() => sanitizeURLSearchParams(params, schema)).toThrow('"name" parameter is missing');
    });

    /**
     * Test handling of special characters in parameter values
     */
    it("should handle URL-encoded parameter values", () => {
        const schema: OpenerParamsSchema = {
            signature: [],
            id: [],
            name: [],
            color: [],
            icon: [],
            url: [],
            index: [],
            pinned: [],
            openInReaderMode: [],
            __validators: [],
        };

        const params = new URLSearchParams("name=test%20name");
        const result = sanitizeURLSearchParams(params, schema);

        expect(result.name).toBe("test name");
    });
});
