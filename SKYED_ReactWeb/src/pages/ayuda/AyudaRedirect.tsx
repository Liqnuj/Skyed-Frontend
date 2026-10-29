import { Navigate, useLocation } from 'react-router-dom';
import { getSiteContext } from '../../utils/siteContext';

/** /ayuda/... redirige a /social/ayuda/... o /deportivo/ayuda/... según el último módulo visitado. */
export default function AyudaRedirect() {
  const { pathname, search } = useLocation();

  return <Navigate to={`/${getSiteContext()}${pathname}${search}`} replace />;
}
