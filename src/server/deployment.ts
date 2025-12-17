/**
 * Deployment detection utilities for Next.js
 * Auto-detects deployment info from Vercel, Netlify, Cloudflare, and other platforms
 */

// Declare process for environments where it exists
declare const process: { env: Record<string, string | undefined> } | undefined;

export interface DeploymentInfo {
  /** Deployment ID from platform */
  deployId?: string;
  /** Git commit SHA */
  gitSha?: string;
  /** Git branch */
  gitBranch?: string;
  /** Deployment URL */
  deployUrl?: string;
  /** Platform name */
  platform?:
    | 'vercel'
    | 'netlify'
    | 'cloudflare'
    | 'railway'
    | 'render'
    | 'github-actions'
    | 'unknown';
}

/**
 * Detect deployment information from environment variables.
 * Works on both client and server.
 */
export function detectDeployment(): DeploymentInfo {
  // Server-side detection
  if (typeof process !== 'undefined' && process.env) {
    const env = process.env;

    // Vercel
    if (env.VERCEL) {
      return {
        deployId: env.VERCEL_DEPLOYMENT_ID,
        gitSha: env.VERCEL_GIT_COMMIT_SHA,
        gitBranch: env.VERCEL_GIT_COMMIT_REF,
        deployUrl: env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
        platform: 'vercel',
      };
    }

    // Netlify
    if (env.NETLIFY) {
      return {
        deployId: env.DEPLOY_ID,
        gitSha: env.COMMIT_REF,
        gitBranch: env.BRANCH,
        deployUrl: env.DEPLOY_URL,
        platform: 'netlify',
      };
    }

    // Cloudflare Pages
    if (env.CF_PAGES) {
      return {
        deployId: env.CF_PAGES_COMMIT_SHA,
        gitSha: env.CF_PAGES_COMMIT_SHA,
        gitBranch: env.CF_PAGES_BRANCH,
        deployUrl: env.CF_PAGES_URL,
        platform: 'cloudflare',
      };
    }

    // Railway
    if (env.RAILWAY_ENVIRONMENT) {
      return {
        deployId: env.RAILWAY_DEPLOYMENT_ID,
        gitSha: env.RAILWAY_GIT_COMMIT_SHA,
        gitBranch: env.RAILWAY_GIT_BRANCH,
        platform: 'railway',
      };
    }

    // Render
    if (env.RENDER) {
      return {
        deployId: env.RENDER_SERVICE_ID,
        gitSha: env.RENDER_GIT_COMMIT,
        gitBranch: env.RENDER_GIT_BRANCH,
        platform: 'render',
      };
    }

    // GitHub Actions
    if (env.GITHUB_ACTIONS) {
      return {
        deployId: env.GITHUB_RUN_ID,
        gitSha: env.GITHUB_SHA,
        gitBranch: env.GITHUB_REF_NAME,
        platform: 'github-actions',
      };
    }

    // Generic fallback
    if (env.DEPLOY_ID || env.GIT_COMMIT) {
      return {
        deployId: env.DEPLOY_ID,
        gitSha: env.GIT_COMMIT || env.COMMIT_SHA,
        gitBranch: env.GIT_BRANCH || env.BRANCH,
        platform: 'unknown',
      };
    }
  }

  return { platform: 'unknown' };
}

/**
 * Get deployment info as a string for display
 */
export function getDeploymentLabel(info: DeploymentInfo): string {
  if (!info.deployId && !info.gitSha) return 'Unknown';

  const parts: string[] = [];
  if (info.gitBranch) parts.push(info.gitBranch);
  if (info.gitSha) parts.push(info.gitSha.slice(0, 7));
  if (info.deployId && !parts.length) parts.push(info.deployId.slice(0, 12));

  return parts.join(' - ') || 'Unknown';
}
