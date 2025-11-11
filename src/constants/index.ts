/**
 * Shared constants for the AWS Containers extension
 */

import { AWSRegion } from "../types";

/**
 * Allowed container colors in Firefox
 */
export const CONTAINER_COLORS = [
    "blue",
    "turquoise",
    "green",
    "yellow",
    "orange",
    "red",
    "pink",
    "purple",
] as const;

export type ContainerColor = typeof CONTAINER_COLORS[number];

/**
 * Allowed container icons in Firefox
 */
export const CONTAINER_ICONS = [
    "fingerprint",
    "briefcase",
    "dollar",
    "cart",
    "circle",
    "gift",
    "vacation",
    "food",
    "fruit",
    "pet",
    "tree",
    "chill",
] as const;

export type ContainerIcon = typeof CONTAINER_ICONS[number];

/**
 * Default container icon
 */
export const DEFAULT_ICON: ContainerIcon = "fingerprint";

/**
 * Custom protocol prefix for container URLs
 */
export const CUSTOM_PROTOCOL_PREFIX = "ext+container:";

/**
 * AWS regions configuration
 */
export const AWS_REGIONS: AWSRegion[] = [
    { code: "us-east-1", name: "US East (N. Virginia)" },
    { code: "us-east-2", name: "US East (Ohio)" },
    { code: "us-west-1", name: "US West (N. California)" },
    { code: "us-west-2", name: "US West (Oregon)" },
    { code: "eu-west-1", name: "EU (Ireland)" },
    { code: "eu-west-2", name: "EU (London)" },
    { code: "eu-central-1", name: "EU (Frankfurt)" },
    { code: "ap-southeast-1", name: "Asia Pacific (Singapore)" },
    { code: "ap-southeast-2", name: "Asia Pacific (Sydney)" },
    { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
];

/**
 * Default AWS region
 */
export const DEFAULT_REGION = "us-east-1";

/**
 * Profile cache duration in milliseconds (5 minutes)
 */
export const PROFILE_CACHE_DURATION = 5 * 60 * 1000;

/**
 * Maximum number of recent profiles to track
 */
export const MAX_RECENT_PROFILES = 10;

/**
 * Native messaging host name
 */
export const NATIVE_MESSAGING_HOST = "aws_profile_bridge";
