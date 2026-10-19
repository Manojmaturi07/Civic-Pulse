import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import CitizenLayout from './layouts/CitizenLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import CitizenDashboard from './pages/citizen/CitizenDashboard.jsx'
import ReportIssue from './pages/citizen/ReportIssue.jsx'
import MyReports from './pages/citizen/MyReports.jsx'
import CommunityMap from './pages/citizen/CommunityMap.jsx'
import Profile from './pages/citizen/Profile.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import Hotspots from './pages/admin/Hotspots.jsx'
import IssueManagement from './pages/admin/IssueManagement.jsx'
import Analytics from './pages/admin/Analytics.jsx'
import ResourcePlanning from './pages/admin/ResourcePlanning.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/citizen" element={<CitizenLayout />}>
        <Route index element={<CitizenDashboard />} />
        <Route path="report" element={<ReportIssue />} />
        <Route path="reports" element={<MyReports />} />
        <Route path="map" element={<CommunityMap />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="hotspots" element={<Hotspots />} />
        <Route path="issues" element={<IssueManagement />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="resources" element={<ResourcePlanning />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
