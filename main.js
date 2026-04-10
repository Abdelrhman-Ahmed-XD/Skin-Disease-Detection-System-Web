function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

const diseaseProfiles = {
    melanoma: {
        label: 'Possible melanoma risk',
        base: 48,
        urgency: 'Urgent dermatology review',
        summary: 'This lesion has several warning signs linked to melanoma screening rules, especially color change, evolution, and border irregularity.',
        recommendations: [
            'Arrange a dermatologist appointment as soon as possible.',
            'Do not rely on home monitoring if the lesion is evolving quickly.',
            'Bring recent photos to compare changes over time.'
        ],
        alertTitle: 'High-risk lesion pattern detected',
        alertText: 'Rapid change, bleeding, asymmetry, or multiple colors should be treated as a priority even when pain is absent.'
    },
    eczema: {
        label: 'Likely eczema / dermatitis',
        base: 26,
        urgency: 'Routine review if persistent',
        summary: 'The symptom pattern fits an inflammatory rash more than a pigmented tumor, especially with itching and scaling.',
        recommendations: [
            'Track triggers such as soaps, heat, fabrics, or seasonal dryness.',
            'Use fragrance-free moisturizers and avoid scratching.',
            'Book a clinical review if the rash spreads or becomes infected.'
        ],
        alertTitle: 'Inflammatory rash pattern',
        alertText: 'If the area starts oozing, crusting, or becomes very painful, the user should seek in-person care.'
    },
    psoriasis: {
        label: 'Possible psoriasis flare',
        base: 32,
        urgency: 'Clinical follow-up recommended',
        summary: 'Scaling with persistent plaques suggests a psoriasis-type flare, especially when lesions are thick and recurring.',
        recommendations: [
            'Track whether plaques appear on elbows, knees, scalp, or lower back.',
            'Photograph the plaque monthly to compare spread and thickness.',
            'Seek treatment planning if lesions interfere with sleep or quality of life.'
        ],
        alertTitle: 'Chronic plaque pattern',
        alertText: 'Widespread, painful, or infected plaques still need clinician review even if they are not cancer-related.'
    },
    nevus: {
        label: 'Likely benign nevus',
        base: 14,
        urgency: 'Monitor routinely',
        summary: 'This lesion appears more consistent with a stable mole pattern because there are fewer danger signs in the current input.',
        recommendations: [
            'Keep a baseline image for comparison in 1 to 3 months.',
            'Watch for changes in border, color, diameter, or symptoms.',
            'Escalate sooner if any ABCDE factor appears later.'
        ],
        alertTitle: 'Low-risk pattern',
        alertText: 'Low-risk does not mean zero risk. New or changing moles still deserve professional review.'
    }
};

const bodyMapPoints = {
    face: { map: 'front', x: 160, y: 64 },
    chest: { map: 'front', x: 160, y: 150 },
    back: { map: 'back', x: 160, y: 170 },
    arm: { map: 'front', x: 108, y: 185 },
    leg: { map: 'front', x: 160, y: 300 }
};

let latestResult = null;
let history = [];

function computeAssessment(formData) {
    const symptomSet = new Set(formData.symptoms);
    const abcdeCount = formData.abcde.length;

    let profile = 'nevus';
    let risk = 12;

    if (abcdeCount >= 3 || symptomSet.has('bleeding') || (symptomSet.has('growth') && symptomSet.has('dark'))) {
        profile = 'melanoma';
        risk = diseaseProfiles.melanoma.base + abcdeCount * 8 + (formData.size === 'large' ? 10 : 0);
    } else if (symptomSet.has('itching') && symptomSet.has('scaling')) {
        profile = symptomSet.has('pain') ? 'psoriasis' : 'eczema';
        risk = diseaseProfiles[profile].base + (formData.size === 'large' ? 8 : formData.size === 'medium' ? 4 : 0);
    } else if (symptomSet.has('pain') && symptomSet.has('scaling')) {
        profile = 'psoriasis';
        risk = diseaseProfiles.psoriasis.base + 10;
    } else {
        risk = diseaseProfiles.nevus.base + abcdeCount * 4 + (symptomSet.has('growth') ? 10 : 0);
    }

    risk = Math.max(8, Math.min(96, risk));

    const riskLevel = risk >= 70 ? 'high' : risk >= 35 ? 'medium' : 'low';
    const confidence = Math.max(51, Math.min(94, 66 + abcdeCount * 4 + formData.symptoms.length * 2));
    const profileData = diseaseProfiles[profile];

    return {
        profile,
        risk,
        riskLevel,
        confidence,
        ...profileData
    };
}

function renderResult(result) {
    $('#resultTitle').textContent = result.label;
    $('#predictionName').textContent = result.label;
    $('#confidenceValue').textContent = `${result.confidence}%`;
    $('#urgencyValue').textContent = result.urgency;
    $('#resultSummary').textContent = result.summary;
    $('#riskMeterFill').style.width = `${result.risk}%`;

    const badge = $('#riskBadge');
    badge.textContent = `${result.riskLevel.toUpperCase()} RISK`;
    badge.className = `risk-badge ${result.riskLevel}`;

    $('#heroRisk').textContent = `${result.risk}% risk score`;
    $('#heroCondition').textContent = result.label;
    $('#heroAction').textContent = result.urgency;

    $('#alertTitle').textContent = result.alertTitle;
    $('#alertText').textContent = result.alertText;
    $('#alertCard').style.borderLeftColor = result.riskLevel === 'high' ? 'var(--danger)' : result.riskLevel === 'medium' ? 'var(--warn)' : 'var(--ok)';

    const recommendations = $('#recommendations');
    recommendations.innerHTML = '';
    result.recommendations.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        recommendations.appendChild(li);
    });
}

function renderHistory() {
    const list = $('#historyList');
    $('#historyCount').textContent = `${history.length} saved`;

    if (!history.length) {
        list.innerHTML = '<p class="history-empty">No local history yet. Analyze a lesion to create the first entry.</p>';
        return;
    }

    list.innerHTML = '';
    history.slice().reverse().forEach((entry) => {
        const item = document.createElement('article');
        item.className = 'history-item';
        item.innerHTML = `
            <strong>${entry.label}</strong>
            <div class="history-meta">
                <span>${entry.date}</span>
                <span>${entry.area}</span>
                <span>${entry.risk}% risk</span>
            </div>
            <p>${entry.note}</p>
        `;
        list.appendChild(item);
    });
}

function addMarker(area) {
    const point = bodyMapPoints[area] || bodyMapPoints.chest;
    const svg = point.map === 'back' ? $('#bodyMapBack') : $('#bodyMapFront');
    if (!svg) return;

    const ns = 'http://www.w3.org/2000/svg';
    const marker = document.createElementNS(ns, 'circle');
    marker.setAttribute('cx', point.x + Math.round(Math.random() * 14 - 7));
    marker.setAttribute('cy', point.y + Math.round(Math.random() * 14 - 7));
    marker.setAttribute('r', 6);
    marker.setAttribute('class', 'marker-dot');
    svg.appendChild(marker);

    $('#status').textContent = `Tracked lesion on ${area}`;
}

function resetForm() {
    $('#screeningForm').reset();
    $('#imagePreview').hidden = true;
    $('#imagePreview').src = '';
    $('#emptyPreview').hidden = false;
    latestResult = null;
    $('#resultTitle').textContent = 'Waiting for patient data';
    $('#predictionName').textContent = 'None yet';
    $('#confidenceValue').textContent = '0%';
    $('#urgencyValue').textContent = 'Not assessed';
    $('#riskBadge').textContent = 'No result';
    $('#riskBadge').className = 'risk-badge neutral';
    $('#riskMeterFill').style.width = '0';
    $('#resultSummary').textContent = 'Upload a lesion photo and add symptoms to generate a mock diagnostic summary.';
    $('#recommendations').innerHTML = '<li>Use clear, well-lit images.</li><li>Track changes in size, border, and color.</li><li>Seek a dermatologist for suspicious lesions.</li>';
    $('#heroRisk').textContent = 'Awaiting scan';
    $('#heroCondition').textContent = 'No result';
    $('#heroAction').textContent = 'Add image';
    $('#alertTitle').textContent = 'Screening tools are not a diagnosis';
    $('#alertText').textContent = 'Any painful, bleeding, rapidly changing, or very dark lesion should be reviewed by a dermatologist.';
}

document.addEventListener('DOMContentLoaded', () => {
    const navToggle = $('#navToggle');
    const nav = $('#mainNav');
    navToggle?.addEventListener('click', () => {
        const expanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', String(!expanded));
        nav.classList.toggle('is-open');
    });

    $all('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (event) => {
            const target = $(link.getAttribute('href'));
            if (!target) return;
            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            nav?.classList.remove('is-open');
            navToggle?.setAttribute('aria-expanded', 'false');
        });
    });

    $('#imageUpload')?.addEventListener('change', (event) => {
        const [file] = event.target.files || [];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            $('#imagePreview').src = reader.result;
            $('#imagePreview').hidden = false;
            $('#emptyPreview').hidden = true;
        };
        reader.readAsDataURL(file);
    });

    $('#screeningForm')?.addEventListener('submit', (event) => {
        event.preventDefault();

        const symptoms = $all('.symptoms-group input:checked').map((input) => input.value);
        const abcde = $all('.abcde-group input:checked').map((input) => input.value);
        const formData = {
            area: $('#bodyArea').value,
            size: $('#lesionSize').value,
            symptoms,
            abcde,
            notes: $('#notes').value.trim()
        };

        latestResult = computeAssessment(formData);
        renderResult(latestResult);
        addMarker(formData.area);

        history.push({
            label: latestResult.label,
            area: formData.area,
            risk: latestResult.risk,
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            note: formData.notes || latestResult.summary
        });

        history = history.slice(-6);
        renderHistory();
    });

    $('#randomMark')?.addEventListener('click', () => {
        const area = $('#bodyArea')?.value || 'chest';
        addMarker(area);
    });

    $('#clearForm')?.addEventListener('click', resetForm);

    $('#authForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = $('#email').value.trim();
        if (!email) return;
        alert(`OTP would be sent to ${email} in a real app.`);
    });

    renderHistory();
    resetForm();
});
