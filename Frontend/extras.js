(function () {
    const tbody = document.querySelector('#result-table tbody');
    const filter = document.querySelector('#filter');
    const searchForm = document.querySelector('#search-form');
    const results = document.querySelector('#results');

    const tip = document.createElement('p');
    tip.className = 'tip';
    tip.textContent = 'Tip: click a user to put their name in the search box. Press / to filter, Esc to clear.';
    results.appendChild(tip);

    tbody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        const nameEl = row && row.querySelector('.user span:last-child');
        if (!nameEl) return;

        tbody.querySelectorAll('tr.picked').forEach((r) => r.classList.remove('picked'));
        row.classList.add('picked');

        const input = searchForm.querySelector('input[name="username"]');
        if (input && !searchForm.classList.contains('hidden')) {
            input.value = nameEl.textContent;
            input.focus();
        }
    });

    document.addEventListener('keydown', (e) => {
        const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
        if (e.key === '/' && !typing) {
            e.preventDefault();
            filter.focus();
        }
        if (e.key === 'Escape' && document.activeElement === filter) {
            filter.value = '';
            filter.dispatchEvent(new Event('input'));
            filter.blur();
        }
    });
})();
