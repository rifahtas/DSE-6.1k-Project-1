const API = 'http://localhost:5050';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const SEARCHES = [
    { id: 'name', num: 3, label: 'Name', title: 'Users matching name', endpoint: '/search/name', mode: 'query',
      fields: [{ name: 'first', label: 'First name' }, { name: 'last', label: 'Last name' }] },
    { id: 'userid', num: 4, label: 'Userid', title: 'User with this userid', endpoint: '/search/userid', mode: 'path',
      fields: [{ name: 'username', label: 'Userid', placeholder: 'e.g. dillon' }] },
    { id: 'salary', num: 5, label: 'Salary', title: 'Salary between X and Y', endpoint: '/search/salary', mode: 'query',
      fields: [{ name: 'min', label: 'Min salary', type: 'number' }, { name: 'max', label: 'Max salary', type: 'number' }] },
    { id: 'age', num: 6, label: 'Age', title: 'Age between X and Y', endpoint: '/search/age', mode: 'query',
      fields: [{ name: 'min', label: 'Min age', type: 'number' }, { name: 'max', label: 'Max age', type: 'number' }] },
    { id: 'after', num: 7, label: 'Registered after', title: 'Registered after this user', endpoint: '/search/after', mode: 'path',
      fields: [{ name: 'username', label: 'Userid', placeholder: 'e.g. dillon' }] },
    { id: 'never', num: 8, label: 'Never signed in', title: 'Users who never signed in', endpoint: '/search/never-signed-in', mode: 'auto', fields: [] },
    { id: 'sameday', num: 9, label: 'Same day', title: 'Registered the same day as this user', endpoint: '/search/same-day', mode: 'path',
      fields: [{ name: 'username', label: 'Userid', placeholder: 'e.g. dillon' }] },
    { id: 'today', num: 10, label: 'Registered today', title: 'Users who registered today', endpoint: '/search/today', mode: 'auto', fields: [] },
    { id: 'all', num: '*', label: 'All users', title: 'All users', endpoint: '/users', mode: 'auto', fields: [] }
];

let current = null;
let rows = [];
let sortState = { key: null, dir: 1 };

function setMsg(el, text, ok) {
    el.textContent = text;
    el.className = 'msg ' + (text ? (ok ? 'ok' : 'err') : '');
}

async function callApi(url, options) {
    const res = await fetch(url, options);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || 'Request failed (' + res.status + ')');
    return body.data;
}

function setSession(user) {
    const box = $('#session');
    box.classList.toggle('on', Boolean(user));
    $('#session-text').textContent = user
        ? 'Signed in as ' + user.username + ' \u00b7 ' + user.signintime
        : 'Not signed in';
    $('#signout').classList.toggle('hidden', !user);
}

function renderChips() {
    const wrap = $('#chips');
    SEARCHES.forEach((s) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.dataset.id = s.id;
        const num = document.createElement('span');
        num.className = 'num';
        num.textContent = s.num;
        const text = document.createElement('span');
        text.textContent = s.label;
        btn.append(num, text);
        btn.addEventListener('click', () => selectSearch(s));
        wrap.appendChild(btn);
    });
}

function selectSearch(s) {
    current = s;
    $$('.chip').forEach((c) => c.classList.toggle('active', c.dataset.id === s.id));
    const form = $('#search-form');
    const fields = $('#search-fields');
    fields.innerHTML = '';

    if (s.mode === 'auto') {
        form.classList.add('hidden');
        runSearch(s, API + s.endpoint);
        return;
    }

    s.fields.forEach((f) => {
        const label = document.createElement('label');
        label.textContent = f.label;
        const input = document.createElement('input');
        input.name = f.name;
        input.type = f.type || 'text';
        if (f.type === 'number') input.step = 'any';
        if (f.placeholder) input.placeholder = f.placeholder;
        label.appendChild(input);
        fields.appendChild(label);
    });
    form.classList.remove('hidden');
    $('input', fields).focus();
}

function buildUrl(s, form) {
    const data = new FormData(form);
    if (s.mode === 'path') {
        const value = (data.get(s.fields[0].name) || '').trim();
        if (!value) return null;
        return API + s.endpoint + '/' + encodeURIComponent(value);
    }
    const qs = new URLSearchParams();
    for (const [k, v] of data) if (v.trim() !== '') qs.append(k, v.trim());
    return API + s.endpoint + ([...qs].length ? '?' + qs.toString() : '');
}

async function runSearch(s, url) {
    const card = $('#results');
    card.classList.add('loading');
    try {
        rows = await callApi(url);
        sortState = { key: null, dir: 1 };
        $('#filter').value = '';
        $('#result-title').textContent = s.title;
        renderTable();
    } catch (err) {
        rows = [];
        renderTable();
        setMsg($('#result-msg'), err.message, false);
    } finally {
        card.classList.remove('loading');
    }
}

function compare(a, b, key) {
    const x = a[key];
    const y = b[key];
    if (x === null || x === undefined) return 1;
    if (y === null || y === undefined) return -1;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    return String(x).localeCompare(String(y));
}

function renderTable() {
    const needle = $('#filter').value.trim().toLowerCase();
    let view = rows.filter((u) =>
        !needle || Object.values(u).some((v) => String(v).toLowerCase().includes(needle)));

    if (sortState.key) {
        view = [...view].sort((a, b) => compare(a, b, sortState.key) * sortState.dir);
    }

    $$('#result-table th').forEach((th) => {
        th.classList.remove('asc', 'desc');
        if (th.dataset.key === sortState.key) th.classList.add(sortState.dir === 1 ? 'asc' : 'desc');
    });

    const tbody = $('#result-table tbody');
    tbody.innerHTML = '';

    if (view.length === 0) {
        const td = tbody.insertRow().insertCell();
        td.colSpan = 7;
        td.className = 'empty';
        td.textContent = 'No matching users';
    }

    view.forEach((u, i) => {
        const tr = tbody.insertRow();
        tr.style.animationDelay = Math.min(i * 30, 300) + 'ms';

        const userCell = tr.insertCell();
        const wrap = document.createElement('div');
        wrap.className = 'user';
        const avatar = document.createElement('span');
        avatar.className = 'avatar';
        avatar.textContent = (u.firstname || '?').charAt(0) + (u.lastname || '').charAt(0);
        const name = document.createElement('span');
        name.textContent = u.username;
        wrap.append(avatar, name);
        userCell.appendChild(wrap);

        tr.insertCell().textContent = u.firstname;
        tr.insertCell().textContent = u.lastname;

        const salary = tr.insertCell();
        salary.className = 'num';
        salary.textContent = Number(u.salary).toLocaleString('en-US');

        const age = tr.insertCell();
        age.className = 'num';
        age.textContent = u.age;

        tr.insertCell().textContent = u.registerday;

        const last = tr.insertCell();
        if (u.signintime) {
            last.textContent = u.signintime;
        } else {
            const pill = document.createElement('span');
            pill.className = 'pill';
            pill.textContent = 'Never';
            last.appendChild(pill);
        }
    });

    $('#result-count').textContent = view.length;
    setMsg($('#result-msg'),
        needle ? 'Showing ' + view.length + ' of ' + rows.length + ' results' : '', true);
}

function refreshIfAuto() {
    if (current && current.mode === 'auto') runSearch(current, API + current.endpoint);
}

$$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        $$('.tab').forEach((t) => t.classList.toggle('active', t === tab));
        $('#register-form').classList.toggle('hidden', tab.dataset.tab !== 'register');
        $('#signin-form').classList.toggle('hidden', tab.dataset.tab !== 'signin');
        setMsg($('#register-msg'), '', true);
        setMsg($('#signin-msg'), '', true);
    });
});

$$('.toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? 'Hide' : 'Show';
    });
});

$('#register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = $('#register-msg');
    try {
        const user = await callApi(API + '/register', {
            method: 'POST',
            headers: { 'Content-type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        setMsg(msg, 'Welcome, ' + user.firstname + '! Registered as "' + user.username + '" on ' + user.registerday + '.', true);
        form.reset();
        refreshIfAuto();
    } catch (err) {
        setMsg(msg, err.message, false);
    }
});

$('#signin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = $('#signin-msg');
    try {
        const user = await callApi(API + '/signin', {
            method: 'POST',
            headers: { 'Content-type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        setMsg(msg, 'Welcome back, ' + user.firstname + '!', true);
        setSession(user);
        form.reset();
        refreshIfAuto();
    } catch (err) {
        setMsg(msg, err.message, false);
        setSession(null);
    }
});

$('#signout').addEventListener('click', () => {
    setSession(null);
    setMsg($('#signin-msg'), '', true);
});

$('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const url = buildUrl(current, e.target);
    if (!url) {
        setMsg($('#result-msg'), 'Please enter a userid.', false);
        return;
    }
    runSearch(current, url);
});

$('#filter').addEventListener('input', renderTable);

$$('#result-table th').forEach((th) => {
    th.addEventListener('click', () => {
        const key = th.dataset.key;
        sortState = sortState.key === key
            ? { key, dir: -sortState.dir }
            : { key, dir: 1 };
        renderTable();
    });
});

renderChips();
selectSearch(SEARCHES[SEARCHES.length - 1]);
