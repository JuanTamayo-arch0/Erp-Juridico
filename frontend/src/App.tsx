import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import ProtectedRoute from './components/ProtectedRoute';
import CasesPage from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import ClientsPage from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import CalendarPage from './pages/Calendar';
import DocumentDetail from './pages/DocumentDetail';
import Layout from './components/Layout';
import SearchResults from './pages/SearchResults';
import DocumentsPage from './pages/Documents';
import UsersPage from './pages/Users';
import UserDetail from './pages/UserDetail';
import RolesPage from './pages/Roles';
import NotAuthorized from './pages/NotAuthorized';
import RequireRole from './components/RequireRole';
import PermissionsPage from './pages/Permissions';
import navRoutes from './navRoutes';
import TasksPage from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import SavedReports from './pages/SavedReports';
import ReportsPage from './pages/Reports';
import CasesKanban from './pages/CasesKanban';
import CasesHistory from './pages/CasesHistory';
import WorkloadPage from './pages/Workload';

export default function App() {
  // When the app is loaded from file:// (packaged Electron), BrowserRouter will
  // navigate to absolute paths like /login which breaks with file protocol.
  // Use HashRouter in that case so routes resolve to index.html#/path.
  const Router = (typeof window !== 'undefined' && window.location.protocol === 'file:') ? HashRouter : BrowserRouter;
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Generated top-level routes from navRoutes (keeps Sidebar and router in sync) */}
          {navRoutes.map((r) => {
            const getPage = (path: string) => {
              switch (path) {
                case '/': return <Home />;
                case '/cases': return <CasesPage />;
                case '/cases/kanban': return <CasesKanban />;
                case '/clients': return <ClientsPage />;
                case '/documents': return <DocumentsPage />;
                case '/calendar': return <CalendarPage />;
                case '/reports': return <ReportsPage />;
                case '/reports/workload': return <WorkloadPage />;
                case '/tasks': return <TasksPage />;
                case '/reports/templates': return <SavedReports />;
                case '/users': return <UsersPage />;
                case '/roles': return <RolesPage />;
                case '/permissions': return <PermissionsPage />;
                case '/cases/history': return <CasesHistory />;
                default: return <div />;
              }
            };

            const content = getPage(r.path);
            const wrapped = r.roles && r.roles.length > 0 ? (
              <ProtectedRoute>
                <RequireRole roles={r.roles}>
                  <Layout>{content}</Layout>
                </RequireRole>
              </ProtectedRoute>
            ) : (
              <ProtectedRoute>
                <Layout>{content}</Layout>
              </ProtectedRoute>
            );

            return <Route key={r.path} path={r.path} element={wrapped} />;
          })}
          {/* Ensure Tasks board route remains accessible even if not in the sidebar */}
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <Layout>
                  <TasksPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Allow SavedReports page via direct route even if not listed in nav */}
          <Route
            path="/reports/templates"
            element={
              <ProtectedRoute>
                <Layout>
                  <SavedReports />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cases/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <CaseDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <ClientDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Layout>
                  <SearchResults />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocumentDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/not-authorized" element={<NotAuthorized />} />
          <Route
            path="/users/:id"
            element={
              <ProtectedRoute>
                <RequireRole roles={["hr", "admin", "partner", "staff"]}>
                  <Layout>
                    <UserDetail />
                  </Layout>
                </RequireRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <TaskDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          
        </Routes>
      </Router>
    </AuthProvider>
  );
}
