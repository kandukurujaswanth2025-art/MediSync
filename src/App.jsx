import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClientInstance } from "@/lib/query-client"
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom"

import PageNotFound from "./lib/PageNotFound"
import ScrollToTop from "./components/ScrollToTop"
import ProtectedRoute from "./components/ProtectedRoute"
import { AppAuthProvider } from "@/lib/AppAuthContext"
import DashboardLayout from "@/components/DashboardLayout"

import Login from "@/pages/Login"
import Register from "@/pages/Register"
import ForgotPassword from "@/pages/ForgotPassword"
import ResetPassword from "@/pages/ResetPassword"

import Landing from "@/pages/Landing"
import HospitalLogin from "@/pages/HospitalLogin"
import ResourceManagerLogin from "@/pages/ResourceManagerLogin"
import PatientLogin from "@/pages/PatientLogin"
import PatientRegister from "@/pages/PatientRegister"
import AccountRecovery from "@/pages/AccountRecovery"
import HospitalSelect from "@/pages/HospitalSelect"

import HospitalDashboard from "@/pages/hospital/HospitalDashboard"
import PatientQueue from "@/pages/hospital/PatientQueue"
import CurrentPatient from "@/pages/hospital/CurrentPatient"
import HospitalMedicines from "@/pages/hospital/HospitalMedicines"
import HospitalRequests from "@/pages/hospital/HospitalRequests"

import ManagerDashboard from "@/pages/manager/ManagerDashboard"
import ManagerDepartments from "@/pages/manager/ManagerDepartments"
import ManagerResources from "@/pages/manager/ManagerResources"
import ManagerRequests from "@/pages/manager/ManagerRequests"
import ManagerStockHistory from "@/pages/manager/ManagerStockHistory"

import PatientDashboard from "@/pages/patient/PatientDashboard"
import RegisterVisit from "@/pages/patient/RegisterVisit"
import MyQueue from "@/pages/patient/MyQueue"
import PatientMedicines from "@/pages/patient/PatientMedicines"
import VisitHistory from "@/pages/patient/VisitHistory"

import Notifications from "@/pages/Notifications"

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />

        <AppAuthProvider>
          <Routes>

            {/* Public pages */}
            <Route path="/" element={<Landing />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* MediSync authentication pages */}
            <Route path="/login/hospital" element={<HospitalLogin />} />
            <Route path="/login/manager" element={<ResourceManagerLogin />} />
            <Route path="/login/patient" element={<PatientLogin />} />
            <Route path="/register/patient" element={<PatientRegister />} />
            <Route path="/account-recovery/:role" element={<AccountRecovery />} />
            <Route path="/select-hospital" element={<HospitalSelect />} />

            {/* Protected application routes */}
            <Route
              element={
                <ProtectedRoute
                  unauthenticatedElement={<Navigate to="/login/hospital" replace />}
                />
              }
            >

              {/* Hospital */}
              <Route element={<DashboardLayout role="hospital" />}>
                <Route path="/hospital" element={<HospitalDashboard />} />
                <Route path="/hospital/queue" element={<PatientQueue />} />
                <Route path="/hospital/current" element={<CurrentPatient />} />
                <Route path="/hospital/medicines" element={<HospitalMedicines />} />
                <Route path="/hospital/requests" element={<HospitalRequests />} />
                <Route path="/hospital/notifications" element={<Notifications />} />
              </Route>

              {/* Resource Manager */}
              <Route element={<DashboardLayout role="manager" />}>
                <Route path="/manager" element={<ManagerDashboard />} />
                <Route path="/manager/departments" element={<ManagerDepartments />} />
                <Route path="/manager/medicines" element={<ManagerResources type="medicine" />} />
                <Route path="/manager/equipment" element={<ManagerResources type="equipment" />} />
                <Route path="/manager/requests" element={<ManagerRequests />} />
                <Route path="/manager/stock-history" element={<ManagerStockHistory />} />
                <Route path="/manager/notifications" element={<Notifications />} />
              </Route>

              {/* Patient */}
              <Route element={<DashboardLayout role="patient" />}>
                <Route path="/patient" element={<PatientDashboard />} />
                <Route path="/patient/register-visit" element={<RegisterVisit />} />
                <Route path="/patient/queue" element={<MyQueue />} />
                <Route path="/patient/medicines" element={<PatientMedicines />} />
                <Route path="/patient/notifications" element={<Notifications />} />
                <Route path="/patient/history" element={<VisitHistory />} />
              </Route>

            </Route>

            <Route path="*" element={<PageNotFound />} />

          </Routes>
        </AppAuthProvider>

        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App