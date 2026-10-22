(function () {
    const tbody = document.querySelector('#result-table tbody');
    const filter = document.querySelector('#filter');
    const searchForm = document.querySelector('#search-form');
    const results = document.querySelector('#results');

    const tip = document.createElement('p');
    tip.className = 'tip';
    tip.textContent = 'Tip: click a user to fill the open search (userid, or first and last name). Press / to filter, Esc to clear.';
    results.appendChild(tip);

    // put a value into a search box if that box is on screen
    function fill(name, value) {
        const input = searchForm.querySelector('input[name="' + name + '"]');
        if (!input) return false;
        input.value = value;
        return true;
    }

    tbody.addEventListener('click', (e) => {
        const row = e.target.closest('tr');
        const nameEl = row && row.querySelector('.user span:last-child');
        if (!nameEl) return;

        tbody.querySelectorAll('tr.picked').forEach((r) => r.classList.remove('picked'));
        row.classList.add('picked');

        if (searchForm.classList.contains('hidden')) return;

        // columns: 0 = username, 1 = first name, 2 = last name
        const username = nameEl.textContent;
        const firstname = row.cells[1] ? row.cells[1].textContent : '';
        const lastname = row.cells[2] ? row.cells[2].textContent : '';

        // searches 4, 7, 9 have a Userid box; search 3 has First and Last name boxes
        const filled = fill('username', username) | fill('first', firstname) | fill('last', lastname);
        if (filled) {
            const first = searchForm.querySelector('input');
            if (first) first.focus();
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
