export interface LinkLiveStreamParams {
    clubId: string;
    matchId: string;
    liveStreamURL: string;
}

export interface LinkLiveStreamOptions {
    /** Number of times to poll the read endpoint for confirmation before giving up. */
    verifyAttempts?: number;
    /** Delay between verification polls, in milliseconds. */
    verifyDelayMs?: number;
    /** How long to leave the request popup open before closing it, in milliseconds. */
    popupCloseDelayMs?: number;
}

const DEFAULT_VERIFY_ATTEMPTS = 3;
const DEFAULT_VERIFY_DELAY_MS = 1500;
const DEFAULT_POPUP_CLOSE_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function extractYouTubeVideoId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
    return match ? match[1] : null;
}

/**
 * Attaches a YouTube live stream URL to a CricClubs match via the control-panel endpoint.
 * Opens a popup to bypass CORS/CORP restrictions, closes it, and polls to verify.
 */
export async function linkLiveStream(
    { clubId, matchId, liveStreamURL }: LinkLiveStreamParams,
    {
        verifyAttempts = DEFAULT_VERIFY_ATTEMPTS,
        verifyDelayMs = DEFAULT_VERIFY_DELAY_MS,
        popupCloseDelayMs = DEFAULT_POPUP_CLOSE_DELAY_MS,
    }: LinkLiveStreamOptions = {}
): Promise<void> {
    const videoId = extractYouTubeVideoId(liveStreamURL);
    if (!videoId) {
        throw new Error('Could not find a YouTube video ID in that URL.');
    }

    const updateParams = new URLSearchParams({ clubId, matchId, liveStreamURL });
    const updateUrl = `https://cricclubs.com/updateLiveStreamURLFromCP.do?${updateParams.toString()}`;

    const popup = window.open(updateUrl, 'linkLiveStreamPopup', 'width=480,height=360');
    if (!popup) {
        throw new Error('Your browser blocked the request popup. Please allow popups for this site and try again.');
    }

    await delay(popupCloseDelayMs);
    popup.close();

    const readUrl = `https://cricclubs.com/liveScoreOverlayData.do?clubId=${clubId}&matchId=${matchId}`;

    for (let attempt = 1; attempt <= verifyAttempts; attempt++) {
        await delay(verifyDelayMs);
        try {
            const response = await fetch(readUrl);
            const data = await response.json();
            if (data && data.values && data.values.liveYouTubeLink && data.values.liveYouTubeLink.includes(videoId)) {
                return;
            }
        } catch (err) {
            console.warn('Verification poll failed:', err);
        }
    }

    throw new Error('Could not confirm the live stream was linked. Double check the match ID.');
}
