import { NavLink } from "react-router-dom"
export default function Sidebar() {
  const menu = [{to:"/dashboard",label:"대시보드"},{to:"/properties",label:"매물"},{to:"/tenants",label:"임차인"},{to:"/contracts",label:"계약"},{to:"/billing",label:"관리비"},{to:"/notifications",label:"알림"},{to:"/reports",label:"보고서"}]
  return (<aside className="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 flex flex-col"><div className="px-5 py-4 border-b"><p className="font-bold text-blue-600">rentflow</p></div><nav className="flex-1 px-3 py-3 space-y-1">{menu.map(m=>(<NavLink key={m.to} to={m.to} className={({isActive})=>"block px-3 py-2 rounded text-sm "+(isActive?"bg-blue-50 text-blue-600 font-medium":"text-gray-600 hover:bg-gray-50")}>{m.label}</NavLink>))}</nav></aside>)
}
