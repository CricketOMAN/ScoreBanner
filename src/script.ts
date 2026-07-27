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
        #chase-info {
            display: none;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            padding: 0 4px 0 12px;
            margin-left: 4px;
            border-left: 1px solid rgba(255,255,255,0.2);
            color: var(--brand-accent, #ffcc00);
            line-height: 1.3;
        }
        #chase-info .chase-team-line {
            font-weight: 700;
            font-size: 13px;
            white-space: nowrap;
        }
        #chase-info .chase-need-line {
            font-weight: 600;
            font-size: 12px;
            white-space: nowrap;
            color: var(--brand-accent, #ffcc00);
        }
        #chase-info .chase-need-detail {
            font-weight: 600;
            font-size: 11px;
            white-space: nowrap;
            color: var(--text-secondary, #e2e8f0);
        }
    `;
    document.head.appendChild(baseStyle);

    /* --- Merge second-innings chase info into the main bar --- */
    const chaseInfo = document.createElement('div');
    chaseInfo.id = 'chase-info';
    const chaseTeamLine = document.createElement('div');
    chaseTeamLine.className = 'chase-team-line';
    const chaseNeedLine = document.createElement('div');
    chaseNeedLine.className = 'chase-need-line';
    const chaseNeedDetail = document.createElement('div');
    chaseNeedDetail.className = 'chase-need-detail';
    chaseInfo.appendChild(chaseTeamLine);
    chaseInfo.appendChild(chaseNeedLine);
    chaseInfo.appendChild(chaseNeedDetail);
    const bowlingInfo = first.querySelector('.bowling-team-info');
    if (bowlingInfo) first.insertBefore(chaseInfo, bowlingInfo);
    else first.appendChild(chaseInfo);

    function syncChaseInfo() {
        const si = document.getElementById('secondInnings');
        const sn = document.getElementById('score-needed');
        if (!si || !sn) return;

        if (si.classList.contains('is-visible') && sn.textContent && sn.textContent !== '-') {
            const parts: string[] = [];
            const n = document.getElementById('second-team-name');
            const s = document.getElementById('second-team-score');
            const w = document.getElementById('second-team-wickets');
            const o = document.getElementById('second-team-overs');
            if (n && n.textContent) parts.push(n.textContent);
            if (s) parts.push(s.textContent + '/' + (w ? w.textContent : ''));
            if (o) parts.push(o.textContent);
            chaseTeamLine.textContent = parts.join('  ');
            const raw = sn.textContent || sn.innerHTML;
            const fromIdx = raw.indexOf(' FROM ');
            if (fromIdx !== -1) {
                chaseNeedLine.textContent = raw.slice(0, fromIdx);
                chaseNeedDetail.textContent = raw.slice(fromIdx + 1);
            } else {
                chaseNeedLine.textContent = raw;
                chaseNeedDetail.textContent = '';
            }
            chaseInfo.style.display = 'flex';
            si.style.display = 'none';
        } else {
            chaseInfo.style.display = 'none';
            si.style.display = '';
        }
    }

    if (second) {
        const co = new MutationObserver(syncChaseInfo);
        co.observe(second, { attributes: true, attributeFilter: ['class'] });
        const sn = document.getElementById('score-needed');
        if (sn) co.observe(sn, { childList: true, characterData: true, subtree: true });
        ['second-team-name','second-team-score','second-team-wickets','second-team-overs'].forEach(id => {
            const el = document.getElementById(id);
            if (el) co.observe(el, { childList: true, characterData: true });
        });
    }
    syncChaseInfo();

    /* --- Dynamic scaling --- */
    let measureTimer: number | null = null;

    function applyScale() {
        const cw = overlayEl.clientWidth;
        const ch = overlayEl.clientHeight;
        const sw = wrapper.scrollWidth;
        const sh = wrapper.scrollHeight;
        if (sw > 0 && sh > 0) {
            const scale = Math.min((cw * 0.95) / sw, (ch * 0.25) / sh, 1);
            let ruleEl = document.getElementById('dynamic-scale-rule');
            if (!ruleEl) {
                ruleEl = document.createElement('style');
                ruleEl.id = 'dynamic-scale-rule';
                document.head.appendChild(ruleEl);
            }
            ruleEl.textContent = `#scaling-wrapper { transform: scale(${scale}); }`;
        }
    }

    const mo = new MutationObserver(() => {
        if (measureTimer !== null) clearTimeout(measureTimer);
        measureTimer = window.setTimeout(applyScale, 50);
    });
    mo.observe(first, { childList: true, subtree: true, characterData: true });

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
