const API = 'http://localhost:5050';

const $ = (sel) => document.querySelector(sel);

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

function showUsers(users, title) {
    $('#result-title').textContent = title;
    const tbody = $('#result-table tbody');
    tbody.innerHTML = '';
    if (users.length === 0) {
        const tr = tbody.insertRow();
        const td = tr.insertCell();
        td.colSpan = 7;
        td.className = 'empty';
        td.textContent = 'No matching users';
    }
    users.forEach((u) => {
        const tr = tbody.insertRow();
        [u.username, u.firstname, u.lastname, u.salary, u.age,
         u.registerday, u.signintime || 'never'].forEach((v) => {
            tr.insertCell().textContent = v;
        });
    });
    setMsg($('#result-msg'), users.length + ' row(s) returned', true);
}

document.querySelectorAll('form.search').forEach((form) => {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        let url = API + form.dataset.endpoint;

        if (form.dataset.param) {
            const value = (data.get(form.dataset.param) || '').trim();
            if (!value) { setMsg($('#result-msg'), 'Please enter a value.', false); return; }
            url += '/' + encodeURIComponent(value);
        } else {
            const qs = new URLSearchParams();
            for (const [k, v] of data) if (v.trim() !== '') qs.append(k, v.trim());
            if ([...qs].length) url += '?' + qs.toString();
        }

        try {
            const users = await callApi(url);
            showUsers(users, form.dataset.title);
        } catch (err) {
            setMsg($('#result-msg'), err.message, false);
        }
    });
});
