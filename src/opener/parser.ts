import { Container, OpenerParamsSchema } from "../types";
import { CONTAINER_COLORS, CONTAINER_ICONS, CUSTOM_PROTOCOL_PREFIX } from "../constants";
import {
    sanitizeURLSearchParams,
    required,
    url,
    integer,
    boolean,
    atLeastOneRequired,
    oneOfOrEmpty,
} from "./validator";

/**
 * Schema for validating opener parameters
 */
const openerParamsSchema: OpenerParamsSchema = {
    // signature
    signature: [],

    // container params
    id: [],
    name: [],
    color: [oneOfOrEmpty([...CONTAINER_COLORS])],
    icon: [oneOfOrEmpty([...CONTAINER_ICONS])],

    // url params
    url: [required, url],
    index: [integer],
    pinned: [boolean],
    openInReaderMode: [boolean],

    // global validators
    __validators: [atLeastOneRequired(["id", "name"])],
};

/**
 * Parses opener parameters from a location hash
 * @param rawHash - The location hash string to parse
 * @returns A Container object with parsed parameters
 * @throws Error if the hash is invalid or required parameters are missing
 */
export function parseOpenerParams(rawHash: string): Container {
    if (rawHash[0] !== "#") {
        throw new Error("not a valid location hash");
    }

    const uri = decodeURIComponent(rawHash.substring(1));

    if (!uri.startsWith(CUSTOM_PROTOCOL_PREFIX)) {
        throw new Error("unknown URI protocol");
    }

    const qs = new URLSearchParams(uri.substring(CUSTOM_PROTOCOL_PREFIX.length));
    const name = qs.get("name");
    if (name == null) {
        throw new Error("container name is required");
    }
    const urlString = qs.get("url");
    if (urlString == null) {
        throw new Error("url is required");
    }
    // ensure that the URL is valid, by parsing it as a URL
    const parsedUrl = new URL(urlString).toString();
    const color = qs.get("color");
    const icon = qs.get("icon");

    const container: Container = {
        name,
        url: parsedUrl,
        color: color && CONTAINER_COLORS.includes(color as any) ? color : undefined,
        icon: icon && CONTAINER_ICONS.includes(icon as any) ? icon : undefined,
    };

    return container;
}
