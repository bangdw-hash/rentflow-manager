import Modal from './Modal'
import { Button } from './ui'

export default function UpgradeModal({ open, onClose, feature, limit }) {
  return (
    <Modal open={open} onClose={onClose} title="플랜 한도 도달">
      <div className="text-center py-2">
        <div className="text-4xl mb-3">🚀</div>
        <p className="text-gray-800 font-semibold">{feature} 한도에 도달했습니다</p>
        <p className="text-sm text-gray-500 mt-1">
          현재 <b>Free 플랜</b>은 {feature} {limit}개까지 가능합니다.
          <br />더 많이 관리하려면 Pro로 업그레이드하세요.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl ring-1 ring-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700">Free</p>
            <p className="text-xs text-gray-500 mt-1">매물 3 · 임차인 5 · 알림 10/월</p>
          </div>
          <div className="rounded-xl ring-2 ring-blue-500 p-4 bg-blue-50/40">
            <p className="text-sm font-semibold text-blue-700">Pro</p>
            <p className="text-xs text-gray-600 mt-1">무제한 매물·임차인·알림</p>
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          <Button variant="ghost" onClick={onClose}>나중에</Button>
          <Button onClick={() => { window.location.href = 'mailto:bangdw@gmail.com?subject=rentflow Pro 업그레이드 문의' }}>
            Pro 업그레이드 문의
          </Button>
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          ※ 결제 연동은 준비 중입니다. Supabase profiles.plan 을 'pro'로 바꾸면 즉시 해제됩니다.
        </p>
      </div>
    </Modal>
  )
}
