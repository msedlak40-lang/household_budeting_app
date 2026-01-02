import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Members from './pages/Members'
import Accounts from './pages/Accounts'
import Categories from './pages/Categories'
import Rules from './pages/Rules'
import Transactions from './pages/Transactions'
import Recurring from './pages/Recurring'
import Analysis from './pages/Analysis'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="categories" element={<Categories />} />
        <Route path="rules" element={<Rules />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="recurring" element={<Recurring />} />
        <Route path="analysis" element={<Analysis />} />
      </Route>
    </Routes>
  )
}

export default App
