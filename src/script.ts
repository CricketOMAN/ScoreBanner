import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import './css/instructions.css';
import { mock_1stInnings, mock_2ndInnings, mock_matchEnded, mock_toss, mock_noTeamImage } from './mockData';
import { sampleReplayData } from './replayData';
import { CONFIG } from './config';
import { DOM } from './dom';
import { getQueryParams } from './utils';
import { applyTheme, updateLogo } from './theme';
import { fetchScoreData } from './api';
import { updateTeamLogos, updateScoreboard } from './ui';
import { CricketAPIData } from './types';

let replayIndex = 0;

/**
 * Main update function that fetches data (or uses mock data) and updates the UI.
 * Handles theme application, logging, and polling logic.
 */
async function updateScore() {
    const params = getQueryParams();
    const instructionsEl = document.getElementById('instructions');
    const overlayEl = document.querySelector('.overlay') as HTMLElement;

    // Show instructions if no match context is provided
    if (!params.matchId && !params.debug && params.mode !== 'replay') {
        if (instructionsEl) instructionsEl.style.display = 'flex';
        if (overlayEl) overlayEl.style.display = 'none';
        return;
    }

    if (instructionsEl) instructionsEl.style.display = 'none';
    if (overlayEl) overlayEl.style.display = '';

    applyTheme(params.theme);
    updateLogo(params.logo);
    handleStreamlabs(params, overlayEl);

    if (params.mode === 'replay') {
        const data = sampleReplayData[replayIndex] as unknown as CricketAPIData;
        updateScoreboard(data);
        replayIndex = (replayIndex + 1) % sampleReplayData.length;
        return;
    }

    if (!params.matchId && !params.debug) {
        return;
    }

    try {
        let data: CricketAPIData;
        if (params.debug) {
            // Mock Data Logic
            switch (params.debug) {
                case '2':
                    data = mock_2ndInnings as unknown as CricketAPIData;
                    break;
                case '3':
                    data = mock_matchEnded as unknown as CricketAPIData;
                    break;
                case '4':
                    data = mock_toss as unknown as CricketAPIData;
                    break;
                case '5':
                    data = mock_noTeamImage as unknown as CricketAPIData;
                    break;
                case '1':
                case 'true':
                default:
                    data = mock_1stInnings as unknown as CricketAPIData;
                    break;
            }
            console.log(`Using mock data: ${params.debug}`);
        } else {
            const apiUrl = `https://cricclubs.com/liveScoreOverlayData.do?clubId=${params.clubId}&matchId=${params.matchId}`;
            data = await fetchScoreData(apiUrl);
        }

        await updateTeamLogos(data);
        updateScoreboard(data);

    } catch (error) {
        console.error('Error fetching score data:', error);
        DOM.teamName.textContent = 'Error';
    }
}

/**
 * Injects dynamic scaling infrastructure that measures the rendered scoreboard
 * width and height then applies a CSS scale transform to fit it within the viewport.
 */
function injectDynamicScale(overlayEl: HTMLElement): void {
    if (document.getElementById('scaling-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'scaling-wrapper';

    const result = document.getElementById('result');
    const first = document.getElementById('firstInnings');
    const second = document.getElementById('secondInnings');
    if (!first) return;

    overlayEl.insertBefore(wrapper, result);
    if (result) wrapper.appendChild(result);
    wrapper.appendChild(first);
    if (second) wrapper.appendChild(second);

    const baseStyle = document.createElement('style');
    baseStyle.id = 'dynamic-scale-base';
    baseStyle.textContent = `
        #scaling-wrapper {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            transform-origin: center bottom;
        }
    `;
    document.head.appendChild(baseStyle);

    let measureTimer: number | null = null;

    function applyScale() {
        const cw = overlayEl.clientWidth;
        const ch = overlayEl.clientHeight;
        const sw = wrapper.scrollWidth;
        const sh = wrapper.scrollHeight;
        if (sw > 0 && sh > 0) {
            const maxContentHeight = ch * 0.25;
            const scale = Math.min(cw / sw, maxContentHeight / sh, 1);
            let ruleEl = document.getElementById('dynamic-scale-rule');
            if (!ruleEl) {
                ruleEl = document.createElement('style');
                ruleEl.id = 'dynamic-scale-rule';
                document.head.appendChild(ruleEl);
            }
            ruleEl.textContent = `#scaling-wrapper { transform: scale(${scale}); }`;
        }
    }

    const observer = new MutationObserver(() => {
        if (measureTimer !== null) clearTimeout(measureTimer);
        measureTimer = window.setTimeout(applyScale, 50);
    });
    observer.observe(first, { childList: true, subtree: true, characterData: true });

    let resizeTimer: number | null = null;
    window.addEventListener('resize', () => {
        if (resizeTimer !== null) clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(applyScale, 80);
    });

    requestAnimationFrame(applyScale);
}

function handleStreamlabs(params: ReturnType<typeof getQueryParams>, overlayEl: HTMLElement | null): void {
    if (params.sl) {
        document.body.classList.add('prov-sl');
    }
    if (params.dynamic || params.sl) {
        if (overlayEl) injectDynamicScale(overlayEl);
    }
}

// Initial call
updateScore();
// Update loop
setInterval(updateScore, CONFIG.REFRESH_RATE);
