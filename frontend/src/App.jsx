import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

const API_URL = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/+$/, '')
// The public address customers call; examples in the docs always use it, even during local development.
const DOCS_BASE = (import.meta.env.VITE_PUBLIC_API_URL || 'https://api.parzivalapi.online').replace(/\/+$/, '')
const SUPPORT_EMAIL = 'parziwalapi@gmail.com'
const SupportLink = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
})
const money = (rupees) => inr.format(rupees)
const count = (n) => new Intl.NumberFormat('en-IN').format(n)
const date = (ms) =>
  new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

async function request(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(API_URL + path, {
    method,
    credentials: 'include',
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // A reply without our JSON error usually means the backend is outdated or not ours.
    const err = new Error(data.error || `The server couldn't handle this request (error ${res.status}). Please try again.`)
    err.status = res.status
    throw err
  }
  return data
}

function Plate({ text, small }) {
  return (
    <span className={small ? 'plate plate-small' : 'plate'}>
      <span className="plate-ind">IND</span>
      <span className="plate-text">{text}</span>
    </span>
  )
}

function CopyButton({ value, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button type="button" className="btn btn-quiet" onClick={copy}>
      {copied ? 'Copied' : label}
    </button>
  )
}

function AuthCard({ onDone }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await request('/api/auth/login', { method: 'POST', body: { email, password } })
      await onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card auth" onSubmit={submit} id="account">
      <h3>Log in</h3>
      <label>
        User ID or email
        <input type="text" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>
        {busy ? 'Please wait…' : 'Log in'}
      </button>
      <small className="muted">Accounts are created by the admin. Need one? Email <SupportLink /></small>
    </form>
  )
}

function Hero({ onAuth }) {
  return (
    <section className="hero wrap">
      <div>
        <Plate text="PARZIVAL API" />
        <h1>Indian vehicle data, one API key.</h1>
        <p className="lede">
          Look up vehicle, driving licence, challan, FASTag and HSRP records over simple HTTP. Buy only the
          calls you need. Lookups that find nothing are not charged.
        </p>
        <div className="hero-links">
          <a href="#pricing">See pricing</a>
          <a href="#docs">Read the docs</a>
        </div>
      </div>
      <AuthCard onDone={onAuth} />
    </section>
  )
}

function Limits({ apis, me }) {
  return (
    <div className="limits">
      {apis.map((api) => (
        <div className="limit" key={api.id}>
          <span className="limit-name">{api.name}</span>
          <strong>{count(me.limits[api.id] ?? 0)}</strong>
          <span className="muted">calls left · {count(me.used[api.id] ?? 0)} used</span>
        </div>
      ))}
    </div>
  )
}

// basePath is /api/keys for your own keys, or an admin path for another user's keys.
function Keys({ keys, reload, basePath = '/api/keys', title = 'Your keys', titleId, children }) {
  const [name, setName] = useState('')
  const [created, setCreated] = useState('')
  const [error, setError] = useState('')

  const create = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { key } = await request(basePath, { method: 'POST', body: { name } })
      setCreated(key)
      setName('')
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const revoke = async (key) => {
    if (!window.confirm(`Revoke "${key.name}"? Apps using this key will stop working.`)) return
    setError('')
    try {
      await request(`${basePath}/${key.id}`, { method: 'DELETE' })
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="card">
      <h3 id={titleId}>{title}</h3>
      <form className="row" onSubmit={create}>
        <input
          aria-label="Key name"
          placeholder="Key name, e.g. Production"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-primary">Create key</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {created && (
        <div className="new-key">
          <p><strong>Copy this key now.</strong> For security it won't be shown again.</p>
          <code>{created}</code>
          <CopyButton value={created} />
        </div>
      )}
      {keys === null ? (
        <p className="muted">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="muted">No keys yet. Create one to start calling the API.</p>
      ) : (
        <ul className="list">
          {keys.map((key) => (
            <li key={key.id}>
              <div>
                <strong>{key.name}</strong>
                <code className="muted">{key.prefix}…</code>
                <small className="muted">
                  {key.last_used_at ? `Last used ${date(key.last_used_at)}` : `Created ${date(key.created_at)}`}
                </small>
              </div>
              <button type="button" className="btn btn-quiet btn-danger" onClick={() => revoke(key)}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  )
}

function Dashboard({ apis, me }) {
  return (
    <section className="wrap dash">
      <h2>Your limits</h2>
      <p className="muted">Signed in as {me.email}</p>
      <Limits apis={apis} me={me} />
      <p className="muted dash-note">Need more calls? Email <SupportLink /></p>
    </section>
  )
}

function ApiKeysPage({ me, reload, onAuth }) {
  return (
    <section className="wrap keys-page">
      <h2>API keys</h2>
      <p className="muted">
        Create a key for each app or server, and revoke any key you no longer use or that may have leaked.
      </p>
      {me ? <Keys keys={me.keys} reload={reload} /> : <AuthCard onDone={onAuth} />}
    </section>
  )
}

function Pricing({ apis }) {
  return (
    <section className="wrap section" id="pricing">
      <h2>Pricing</h2>
      <p className="muted">Pay per call. No subscription. Limits don't expire.</p>
      <div className="rates">
        {apis.map((api) => (
          <div className="rate" key={api.id}>
            <div>
              <h3>{api.name}</h3>
              <p className="muted">{api.description}</p>
            </div>
            <code className="rate-path">GET /v1/{api.id}</code>
            <span className="status status-approved">Live</span>
            <div className="rate-price">
              <strong>{money(api.price)}</strong>
              <span className="muted">per call</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const ERRORS = [
  ['400', 'The number is missing or badly formatted.', 'No'],
  ['401', 'API key is missing, invalid or revoked.', 'No'],
  ['402', 'You have no calls left for this API. The response includes calls_left.', 'No'],
  ['404', 'No record exists for this number, or the API name in the URL is wrong.', 'No'],
  ['429', 'More than 60 requests in a minute.', 'No'],
  ['502', 'The data source failed or timed out.', 'No'],
  ['503', 'This API is temporarily unavailable.', 'No'],
]

function buildSamples(base, api) {
  const url = `${base}/v1/${api.id}?number=${api.example}`
  return {
    cURL: `curl "${url}" \\\n  -H "X-API-Key: YOUR_API_KEY"`,
    JavaScript: `const res = await fetch("${url}", {\n  headers: { "X-API-Key": "YOUR_API_KEY" },\n});\nconst body = await res.json();\nconsole.log(body);`,
    Python: `import requests\n\nres = requests.get(\n    "${base}/v1/${api.id}",\n    params={"number": "${api.example}"},\n    headers={"X-API-Key": "YOUR_API_KEY"},\n    timeout=30,\n)\nprint(res.json())`,
    PHP: `<?php\n$ch = curl_init("${url}");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ["X-API-Key: YOUR_API_KEY"]);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\necho curl_exec($ch);`,
  }
}

function Popup({ titleId, onClose, children }) {
  const dialog = useRef(null)

  useEffect(() => {
    dialog.current.showModal()
  }, [])

  return (
    <dialog ref={dialog} className="modal" aria-labelledby={titleId} onClose={onClose}>
      {children}
    </dialog>
  )
}

function AddUserPopup({ onCreated, onClose }) {
  return (
    <Popup titleId="add-user-title" onClose={onClose}>
      <CreateUser onCreated={onCreated} onCancel={onClose} />
    </Popup>
  )
}

function CreateUser({ onCreated, onCancel }) {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await request('/api/admin/users', { method: 'POST', body: { userId, password } })
      await onCreated(userId.trim().toLowerCase())
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="card stack admin-create" onSubmit={submit}>
      <h3 id="add-user-title">Add user</h3>
      <div className="row admin-fields">
        <label>
          User ID
          <input required minLength={3} maxLength={254} autoComplete="off" value={userId} onChange={(e) => setUserId(e.target.value)} />
        </label>
        <label>
          Password
          <input
            required
            minLength={6}
            maxLength={200}
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <small>At least 6 characters.</small>
        </label>
      </div>
      <small className="muted">New users start with 0 calls. Add calls with Sell calls.</small>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : 'Create user'}</button>
      </div>
    </form>
  )
}

function UserKeysPopup({ user, onClose }) {
  const [keys, setKeys] = useState(null)
  const [error, setError] = useState('')
  const basePath = `/api/admin/users/${user.id}/keys`

  const load = useCallback(async () => {
    try {
      setKeys((await request(basePath)).keys)
    } catch (err) {
      setError(err.message)
    }
  }, [basePath])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Popup titleId="user-keys-title" onClose={onClose}>
      <Keys keys={keys} reload={load} basePath={basePath} title={`API keys for ${user.email}`} titleId="user-keys-title">
        {error && <p className="error" role="alert">{error}</p>}
        <p className="muted">
          Keys you create here work exactly like keys the user makes, and show on their API keys page. Send the key to
          them securely.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>Close</button>
        </div>
      </Keys>
    </Popup>
  )
}

function UserRow({ user, onManageKeys }) {
  return (
    <tr>
      <td>
        {user.email}
        {user.role === 'admin' && <small className="muted"> (admin)</small>}
      </td>
      {['vehicle', 'hsrp'].map((api) => (
        <td key={api}>
          <strong>{count(user.limits[api] ?? 0)}</strong>
          <small className="muted"> · {count(user.used[api] ?? 0)} used</small>
        </td>
      ))}
      <td>{date(user.created_at)}</td>
      <td>
        <button type="button" className="btn btn-quiet" onClick={() => onManageKeys(user)}>
          API keys ({count(user.activeKeys ?? 0)})
        </button>
      </td>
    </tr>
  )
}

const SELLABLE_APIS = { vehicle: 'Vehicle', hsrp: 'HSRP' }

function SellCalls({ onSold, onCancel }) {
  const [users, setUsers] = useState([])
  const [userId, setUserId] = useState('')
  const [api, setApi] = useState('vehicle')
  const [quantity, setQuantity] = useState('')
  const [buyRate, setBuyRate] = useState('')
  const [sellRate, setSellRate] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    request('/api/admin/users')
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err.message))
  }, [])

  const cost = Number(quantity) * Number(buyRate)
  const revenue = Number(quantity) * Number(sellRate)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await request('/api/admin/sales', {
        method: 'POST',
        body: {
          userId: Number(userId),
          api,
          quantity: Number(quantity),
          buyRate: Number(buyRate),
          sellRate: Number(sellRate),
        },
      })
      const buyer = users.find((u) => u.id === Number(userId))
      await onSold(`Sold ${count(Number(quantity))} ${SELLABLE_APIS[api]} calls to ${buyer?.email}.`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h3 id="sell-calls-title">Sell calls</h3>
      <div className="row admin-fields">
        <label>
          User
          <select required value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="" disabled>Choose a user</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
          </select>
        </label>
        <label>
          API
          <select value={api} onChange={(e) => setApi(e.target.value)}>
            {Object.entries(SELLABLE_APIS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
      </div>
      <label>
        Number of calls
        <input type="number" min="1" max="10000000" step="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </label>
      <div className="row admin-fields">
        <label>
          Buy rate (₹ per call)
          <input type="number" min="0" max="100000" step="0.01" required value={buyRate} onChange={(e) => setBuyRate(e.target.value)} />
        </label>
        <label>
          Sell rate (₹ per call)
          <input type="number" min="0" max="100000" step="0.01" required value={sellRate} onChange={(e) => setSellRate(e.target.value)} />
        </label>
      </div>
      <div className="pay">
        <div><span className="muted">Your cost</span><strong>{money(cost)}</strong></div>
        <div><span className="muted">Sale amount</span><strong>{money(revenue)}</strong></div>
        <div><span className="muted">Profit</span><strong className={revenue < cost ? 'error' : ''}>{money(revenue - cost)}</strong></div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : 'Sell and add calls'}</button>
      </div>
    </form>
  )
}

function Sales() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selling, setSelling] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      setData(await request('/api/admin/sales'))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const paise = (value) => money(value / 100)
  const totals = data?.totals

  return (
    <section className="wrap section">
      <div className="section-head">
        <h2>Sales records</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setNotice('')
            setSelling(true)
          }}
        >
          Sell calls
        </button>
      </div>
      <p className="muted">Each sale records your buy and sell rate, and adds the calls to that user's limit.</p>
      {selling && (
        <Popup titleId="sell-calls-title" onClose={() => setSelling(false)}>
          <SellCalls
            onCancel={() => setSelling(false)}
            onSold={async (message) => {
              await load()
              setSelling(false)
              setNotice(message)
            }}
          />
        </Popup>
      )}
      {notice && <p className="ok" role="status">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {totals && (
        <div className="limits sales-totals">
          <div className="limit"><span className="limit-name">Calls sold</span><strong>{count(totals.calls)}</strong></div>
          <div className="limit"><span className="limit-name">Total cost</span><strong>{paise(totals.cost_paise)}</strong></div>
          <div className="limit"><span className="limit-name">Total sales</span><strong>{paise(totals.revenue_paise)}</strong></div>
          <div className="limit"><span className="limit-name">Total profit</span><strong>{paise(totals.revenue_paise - totals.cost_paise)}</strong></div>
        </div>
      )}
      {data?.sales.length === 0 && <p className="muted">No sales yet.</p>}
      {data?.sales.length > 0 && (
        <div className="doc-table">
          <table>
            <thead>
              <tr><th>Date</th><th>User</th><th>API</th><th>Calls</th><th>Buy rate</th><th>Sell rate</th><th>Cost</th><th>Sale amount</th><th>Profit</th></tr>
            </thead>
            <tbody>
              {data.sales.map((s) => {
                const cost = s.quantity * s.buy_rate_paise
                const revenue = s.quantity * s.sell_rate_paise
                return (
                  <tr key={s.id}>
                    <td>{date(s.created_at)}</td>
                    <td>{s.email}</td>
                    <td>{SELLABLE_APIS[s.api] ?? s.api}</td>
                    <td>{count(s.quantity)}</td>
                    <td>{paise(s.buy_rate_paise)}</td>
                    <td>{paise(s.sell_rate_paise)}</td>
                    <td>{paise(cost)}</td>
                    <td>{paise(revenue)}</td>
                    <td className={revenue < cost ? 'error' : ''}>{paise(revenue - cost)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Users() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [keysFor, setKeysFor] = useState(null)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await request('/api/admin/users')
      setUsers(data.users)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="wrap section">
      <div className="section-head">
        <h2>Users</h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setNotice('')
            setAdding(true)
          }}
        >
          Add user
        </button>
      </div>
      <p className="muted">Only you can create accounts. Calls are added by selling calls, and go down as the user makes calls.</p>
      {adding && (
        <AddUserPopup
          onClose={() => setAdding(false)}
          onCreated={async (id) => {
            await load()
            setAdding(false)
            setNotice(`Created ${id}. Share the ID and password with them.`)
          }}
        />
      )}
      {notice && <p className="ok" role="status">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {users?.length > 0 && (
        <div className="doc-table">
          <table>
            <thead>
              <tr><th>User ID</th><th>Vehicle calls left</th><th>HSRP calls left</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => <UserRow key={u.id} user={u} onManageKeys={setKeysFor} />)}
            </tbody>
          </table>
        </div>
      )}
      {keysFor && (
        <UserKeysPopup
          user={keysFor}
          onClose={() => {
            setKeysFor(null)
            load()
          }}
        />
      )}
    </section>
  )
}

const STAT_COLUMNS = [
  ['opening', 'Opening'],
  ['added', 'Added'],
  ['used', 'Used'],
  ['left', 'Left'],
]

const sumBy = (rows, pick) => rows.reduce((total, row) => total + pick(row), 0)

// How long ago a timestamp was, e.g. "5 minutes ago".
const ago = (ms) => {
  const minutes = Math.round((Date.now() - ms) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  return date(ms)
}

// Only the Vehicle provider reports its quota today; others appear here once they do.
const PROVIDER_APIS = ['vehicle']

function ProviderBalance() {
  const [providers, setProviders] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    request('/api/admin/provider-usage')
      .then((data) => setProviders(data.providers))
      .catch((err) => setError(err.message))
  }, [])

  const refresh = async (api) => {
    if (!window.confirm('Checking now makes 1 real lookup with your provider and uses 1 of your provider calls. Continue?')) return
    setBusy(api)
    setError('')
    try {
      setProviders((await request(`/api/admin/provider-usage/${api}/refresh`, { method: 'POST' })).providers)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="provider-balance">
      {PROVIDER_APIS.map((api) => {
        const p = providers?.find((x) => x.api === api)
        const low = p && p.remaining <= p.total_limit * 0.1
        return (
          <div className="card provider-card" key={api}>
            <div>
              <span className="limit-name">{API_TITLES[api]} provider balance</span>
              {p ? (
                <>
                  <strong className={low ? 'error' : ''}>{count(p.remaining)} left</strong>
                  <span className="muted">
                    {count(p.used)} used of {count(p.total_limit)} · updated {ago(p.checked_at)}
                  </span>
                  {low && <span className="error">Running low. Top up with your provider.</span>}
                </>
              ) : (
                <span className="muted">{providers ? 'No reading yet. It updates on every lookup.' : 'Loading…'}</span>
              )}
            </div>
            <button type="button" className="btn btn-quiet" disabled={busy === api} onClick={() => refresh(api)}>
              {busy === api ? 'Checking…' : 'Check now'}
            </button>
          </div>
        )
      })}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}

function StatsDashboard() {
  const [day, setDay] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    request(`/api/admin/stats${day ? `?date=${day}` : ''}`)
      .then((result) => {
        if (!current) return
        setData(result)
        setError('')
      })
      .catch((err) => current && setError(err.message))
    return () => {
      current = false
    }
  }, [day])

  const apis = Object.entries(SELLABLE_APIS)
  const users = data?.users ?? []
  const total = (api, column) => sumBy(users, (u) => u.apis[api][column])

  return (
    <section className="wrap section">
      <div className="section-head">
        <h2>Dashboard</h2>
        <label className="date-pick">
          Day
          <input
            type="date"
            max={data?.today}
            value={day || data?.date || ''}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
      </div>
      <ProviderBalance />
      <p className="muted">
        Calls per user for {data ? data.date === data.today ? 'today' : data.date : '…'} (India time).
        Opening is the balance when the day started; Left is the balance when it ended, or right now for today.
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {data && (
        <>
          <div className="limits sales-totals">
            {apis.map(([api, name]) => (
              <div className="limit" key={`${api}-used`}>
                <span className="limit-name">{name} used</span>
                <strong>{count(total(api, 'used'))}</strong>
                <span className="muted">of {count(total(api, 'opening') + total(api, 'added'))} available</span>
              </div>
            ))}
            {apis.map(([api, name]) => (
              <div className="limit" key={`${api}-left`}>
                <span className="limit-name">{name} left</span>
                <strong>{count(total(api, 'left'))}</strong>
                <span className="muted">{count(total(api, 'added'))} added this day</span>
              </div>
            ))}
          </div>

          <h3 className="stats-heading">By user</h3>
          <div className="doc-table">
            <table className="stats-table">
              <thead>
                <tr>
                  <th rowSpan={2}>User ID</th>
                  {apis.map(([api, name]) => <th key={api} colSpan={4} className="group">{name}</th>)}
                </tr>
                <tr>
                  {apis.map(([api]) =>
                    STAT_COLUMNS.map(([column, label]) => <th key={`${api}-${column}`} className="num">{label}</th>),
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.email}
                      {u.role === 'admin' && <small className="muted"> (admin)</small>}
                    </td>
                    {apis.map(([api]) =>
                      STAT_COLUMNS.map(([column]) => (
                        <td key={`${api}-${column}`} className={column === 'left' ? 'num strong' : 'num'}>
                          {count(u.apis[api][column])}
                        </td>
                      )),
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total</th>
                  {apis.map(([api]) =>
                    STAT_COLUMNS.map(([column]) => (
                      <th key={`${api}-${column}`} className="num">{count(total(api, column))}</th>
                    )),
                  )}
                </tr>
              </tfoot>
            </table>
          </div>

          <h3 className="stats-heading">Last 30 days</h3>
          <p className="muted">All users together. Pick a day to see it by user.</p>
          <div className="doc-table">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Day</th>
                  {apis.map(([api, name]) => <th key={`${api}-used`} className="num">{name} used</th>)}
                  {apis.map(([api, name]) => <th key={`${api}-added`} className="num">{name} added</th>)}
                </tr>
              </thead>
              <tbody>
                {data.history.map((row) => (
                  <tr key={row.date} className={row.date === data.date ? 'selected' : ''}>
                    <td>
                      <button type="button" className="link-btn" onClick={() => setDay(row.date)}>
                        {date(Date.parse(`${row.date}T00:00:00+05:30`))}
                      </button>
                    </td>
                    {apis.map(([api]) => <td key={`${api}-used`} className="num">{count(row.used[api])}</td>)}
                    {apis.map(([api]) => <td key={`${api}-added`} className="num">{count(row.added[api])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

// Field names and types match the live providers (checked Nov 2026). Every value is
// made up: real responses describe a real vehicle and its owner.
const SAMPLE_DATA = {
  vehicle: {
    REGN_NO: 'MH12AB1234',
    REGN_DT: '15-Mar-2019',
    REGN_UPTO: '14-Mar-2034',
    OWNER_NAME: 'RAHUL SHARMA',
    F_NAME: 'SURESH SHARMA',
    STATE_CD: 'MH',
    RTO_CD: 'MH12',
    PRESENT_ADDRESS: 'FLAT 12, SAMPLE SOCIETY, PUNE, 411001',
    PERMANENT_ADDRESS: 'FLAT 12, SAMPLE SOCIETY, PUNE, 411001',
    MOBILE_NO: '98XXXXXX10',
    CHASI_NO: 'MA3XXXXXXXX123456',
    ENG_NO: 'K12MXXXX1234',
    MAKER_DESC: 'MARUTI SUZUKI INDIA LTD',
    MAKER_MODEL: 'SWIFT VXI',
    BODY_TYPE_DESC: 'SALOON',
    FUEL_DESC: 'PETROL',
    COLOR: 'WHITE',
    FIT_UPTO: '14-Mar-2034',
    INSURANCE_COMP: 'SAMPLE GENERAL INSURANCE CO. LTD.',
    INSURANCE_UPTO: '10-Mar-2027',
    MANU_MONTH_YR: '02/2019',
    POLICY_NO: '',
    PUC_UPTO: '20-Aug-2026',
    INS_POLICY_NO: 'XXXXXXXX1234',
    FINANCER_DETAILS: '',
    PERMIT_NO: '',
    PERMIT_ISSUE_DATE: '',
    RC_NP_NO: '',
    REGISTERED_AT: 'PUNE RTO, Maharashtra',
    STATUS_AS_ON: '10-Nov-2026',
    PUCC_UPTO: '20-Aug-2026',
    PUCC_NO: 'MH01200XXXXXX',
    STATUS: 'ACTIVE',
    VEHICLE_SURRENDERED_TO_DEALER: 'N',
    CURRENTADD_STATENAME: 'Maharashtra',
    CURRENTADD_DISTRICTCODE: 'PUNE',
    CURRENTADD_PINCODE: '411001',
    VEHICLE_CLASS: 'Motor Car(LMV)',
    VEHICLE_CATEGORY: 'LMV',
    SEATING_CAPACITY: 5,
    SLEEPER_CAPACITY: '0',
    STANDING_CAPACITY: '0',
    OWNER_SERIAL_NO: 1,
    UNLADEN_WEIGHT: '875',
    LADEN_WEIGHT: '1340',
    WHEELBASE: '2450',
    NO_OF_CYLINDERS: '4',
    CUBIC_CAPACITY: 1197,
    FUEL_NORMS: 'BHARAT STAGE IV',
    TAX_UPTO: 'LTT',
    BLACKLIST_STATUS: '',
    NOC_DETAILS: '',
    IS_COMMERCIAL: 'N',
  },
  hsrp: {
    status: 'Success',
    regno: 'MH12AB1234',
    chassis: 'MA3XXXXXXXX123456',
    engine: 'K12MXXXX1234',
    hsrp_response: {
      message: 'Success',
      fuel: 'PETROL',
      maker: 'MARUTI SUZUKI INDIA LTD',
      vchType: 'Non-Transport',
      norms: 'BHARAT STAGE IV',
      vchCatg: 'LMV',
      regnDate: '15-Mar-2019',
      hsrpFrontLaserCode: 'XXXXXXXXXX1234',
      hsrpRearLaserCode: 'XXXXXXXXXX1235',
      stateCd: 'MH',
      offCd: 12,
      mobileNumberValidation: null,
    },
  },
}

// Example balances for the demo responses: the called API's balance has just gone down.
const sampleCallsLeft = (apiId) => ({ vehicle: apiId === 'vehicle' ? 99 : 250, hsrp: apiId === 'hsrp' ? 99 : 40 })

const RESPONSE_FIELDS = [
  ['success', '`true` when the lookup worked.'],
  ['api', 'Which API you called: `vehicle` or `hsrp`.'],
  ['charged', 'The list price of this call in rupees.'],
  ['remaining', 'Calls you have left on this API, after this call.'],
  ['calls_left', 'Calls you have left on every API, e.g. `{ "vehicle": 99, "hsrp": 40 }`.'],
  ['data', 'The record from the data source. Fields are listed in the example below.'],
]

// Renders `code` spans inside short help text.
const withCode = (text) =>
  text.split(/(`[^`]+`)/).map((part, i) => (part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part))

const API_TITLES = { vehicle: 'Vehicle (VAHAN)', hsrp: 'HSRP' }

function ApiDocs({ apis }) {
  const docApis = apis.filter((a) => Object.hasOwn(API_TITLES, a.id))
  const [apiId, setApiId] = useState('vehicle')
  const [lang, setLang] = useState('cURL')
  const api = docApis.find((a) => a.id === apiId) ?? docApis[0]
  if (!api) return <p className="muted">These APIs aren't in the catalog.</p>

  const endpoint = `${DOCS_BASE}/v1/${api.id}`
  const exampleUrl = `${endpoint}?number=${api.example}`
  const samples = buildSamples(DOCS_BASE, api)
  const callsLeft = sampleCallsLeft(api.id)
  const response = JSON.stringify(
    {
      success: true,
      api: api.id,
      charged: api.price,
      remaining: callsLeft[api.id],
      calls_left: callsLeft,
      data: SAMPLE_DATA[api.id],
    },
    null,
    2,
  )
  const noCallsResponse = JSON.stringify(
    {
      success: false,
      error: `No ${api.name} limits left. Contact the admin to get more calls.`,
      calls_left: { ...callsLeft, [api.id]: 0 },
    },
    null,
    2,
  )

  return (
    <section className="wrap section">
      <h2>API docs</h2>
      <p className="muted">How to call the Vehicle (VAHAN) and HSRP APIs. Every example uses <code>{DOCS_BASE}</code>.</p>

      <div className="doc-block">
        <h3>Get started</h3>
        <ol className="steps">
          <li>Get your user ID and password from the admin, and log in.</li>
          <li>Create a key on the <a href="#api-keys">API keys</a> page.</li>
          <li>Make sure you have calls left for the API you need. To get more, email <SupportLink />.</li>
        </ol>
      </div>

      <div className="tabs api-tabs" role="tablist">
        {docApis.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={a.id === api.id} onClick={() => setApiId(a.id)}>
            {API_TITLES[a.id]}
          </button>
        ))}
      </div>

      <div className="doc-block">
        <h3>
          Endpoint{' '}
          <span className={`status ${api.live ? 'status-approved' : 'status-rejected'}`}>
            {api.live ? 'Live' : 'Not set up'}
          </span>
        </h3>
        <div className="endpoint">
          <span className="method">GET</span>
          <code>{endpoint}</code>
          <CopyButton value={endpoint} />
        </div>
        <p className="muted">{api.description} Example: <code>{exampleUrl}</code></p>
      </div>

      <div className="doc-block">
        <h3>Request</h3>
        <div className="doc-table">
          <table>
            <thead><tr><th>Name</th><th>Sent in</th><th>Required</th><th>Description</th></tr></thead>
            <tbody>
              <tr>
                <td><code>X-API-Key</code></td>
                <td>Header</td>
                <td>Yes</td>
                <td>Your API key, from the <a href="#api-keys">API keys</a> page. Keep it on your server, never in website or app code.</td>
              </tr>
              <tr>
                <td><code>number</code></td>
                <td>Query</td>
                <td>Yes</td>
                <td>Vehicle registration number, e.g. <code>{api.example}</code> or <code>22BH1234AB</code>. Spaces and dashes are removed, and letters can be any case.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="doc-block">
        <h3>Code</h3>
        <div className="code-head">
          <div className="tabs tabs-code" role="tablist">
            {Object.keys(samples).map((l) => (
              <button key={l} type="button" role="tab" aria-selected={l === lang} onClick={() => setLang(l)}>{l}</button>
            ))}
          </div>
          <CopyButton value={samples[lang]} />
        </div>
        <pre><code>{samples[lang]}</code></pre>
      </div>

      <div className="doc-block">
        <h3>Response</h3>
        <div className="doc-table">
          <table>
            <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
            <tbody>
              {RESPONSE_FIELDS.map(([field, meaning]) => (
                <tr key={field}><td><code>{field}</code></td><td>{withCode(meaning)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="code-head">
          <strong>Example: successful {API_TITLES[api.id]} lookup</strong>
          <CopyButton value={response} />
        </div>
        <pre><code>{response}</code></pre>
        <p className="muted">
          The field names are exactly what the API returns. The values are made up, so the example shows no real
          vehicle or owner.
        </p>
      </div>

      <div className="doc-block">
        <h3>When you run out of calls</h3>
        <p>
          You get status <code>402</code>, and <code>calls_left</code> shows your balance on every API so you know what
          to top up.
        </p>
        <pre><code>{noCallsResponse}</code></pre>
      </div>

      <div className="doc-block">
        <h3>Errors</h3>
        <p>Errors return <code>{'{ "success": false, "error": "message" }'}</code>. You are never charged for an error.</p>
        <div className="doc-table">
          <table>
            <thead><tr><th>Status</th><th>Meaning</th><th>Charged</th></tr></thead>
            <tbody>
              {ERRORS.map(([code, meaning, charged]) => (
                <tr key={code}><td><code>{code}</code></td><td>{meaning}</td><td>{charged}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="doc-block">
        <h3>Limits</h3>
        <p>
          Each successful lookup uses one call from your {API_TITLES[api.id]} balance. Each API key can make up to 60
          requests a minute.
        </p>
      </div>
    </section>
  )
}

// Sidebar order. The first page is the default admin view.
const ADMIN_PAGES = [
  ['#dashboard', 'Dashboard', StatsDashboard],
  ['#users', 'Users', Users],
  ['#sell-calls', 'Sell calls', Sales],
  ['#api-docs', 'API docs', ApiDocs],
]
const ADMIN_HASHES = ['#admin', ...ADMIN_PAGES.map(([hash]) => hash)] // #admin is the old link.

function AdminLayout({ hash, apis }) {
  const [active, , Page] = ADMIN_PAGES.find(([h]) => h === hash) ?? ADMIN_PAGES[0]
  return (
    <div className="wrap admin-layout">
      <aside className="admin-side">
        <span className="admin-side-title">Admin</span>
        <nav aria-label="Admin">
          {ADMIN_PAGES.map(([h, label]) => (
            <a key={h} href={h} aria-current={h === active ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <Page apis={apis} />
      </div>
    </div>
  )
}

export default function App() {
  const [catalog, setCatalog] = useState(null)
  const [me, setMe] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [hash, setHash] = useState(window.location.hash)
  const isAdmin = ADMIN_HASHES.includes(hash)
  const isKeysPage = hash === '#api-keys'
  const isDocsPage = hash === '#docs'

  const loadMe = useCallback(async () => {
    try {
      const data = await request('/api/me')
      setMe(data)
      return data
    } catch (err) {
      if (err.status === 401) setMe(null)
      else throw err
    }
  }, [])

  const afterAuth = async () => {
    const user = await loadMe()
    if (user?.role === 'admin') window.location.hash = '#dashboard'
  }

  useEffect(() => {
    Promise.all([request('/api/catalog').then(setCatalog), loadMe()]).catch(() => setLoadError(true))
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [loadMe])

  // The target section may not exist until the new page has rendered, so the
  // browser's own anchor jump can't be relied on when switching pages.
  useEffect(() => {
    if (!catalog) return
    if (isKeysPage || isAdmin || isDocsPage) window.scrollTo(0, 0)
    else if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash, catalog, isKeysPage, isAdmin, isDocsPage])

  const logout = async () => {
    await request('/api/auth/logout', { method: 'POST' })
    setMe(null)
  }

  if (loadError) return <p className="wrap section error">Couldn't reach the server. Please refresh in a moment.</p>
  if (!catalog) return <p className="wrap section muted">Loading…</p>

  return (
    <>
      <header className="nav">
        <div className="wrap nav-inner">
          <a href="#top" className="brand"><Plate text="PARZIVAL" small /></a>
          <nav>
            <a href="#pricing">Pricing</a>
            <a href="#docs" aria-current={isDocsPage ? 'page' : undefined}>Docs</a>
            {me && <a href="#api-keys">API keys</a>}
            {me?.role === 'admin' && <a href="#dashboard" className="nav-admin">Admin</a>}
            {me && <button type="button" className="btn btn-quiet" onClick={logout}>Log out</button>}
          </nav>
        </div>
      </header>
      <main id="top">
        {isAdmin && me?.role === 'admin' ? (
          <AdminLayout hash={hash} apis={catalog.apis} />
        ) : isKeysPage ? (
          <ApiKeysPage me={me} reload={loadMe} onAuth={afterAuth} />
        ) : isDocsPage ? (
          <div className="docs-page">
            <ApiDocs apis={catalog.apis} />
          </div>
        ) : (
          <>
            {me ? (
              <Dashboard apis={catalog.apis} me={me} />
            ) : (
              <Hero onAuth={afterAuth} />
            )}
            <Pricing apis={catalog.apis} />
          </>
        )}
      </main>
      <footer className="wrap footer muted">
        <span>Parzival API</span>
        <span>Support: <SupportLink /></span>
      </footer>
    </>
  )
}
