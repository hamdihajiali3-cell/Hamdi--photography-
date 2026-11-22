import React, { Suspense, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@designcodeio/threeui/style.css';
import './index.css';

// ThreeUI is intentionally lazy-loaded: the live Hamdi Photography pages are untouched.
const AtTheHorizon = React.lazy(() =>
  import('@designcodeio/threeui').then(module => ({ default: module.AtTheHorizon }))
);

class DemoErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: false }; }
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) return <p role="alert">تعذّر عرض هذا المكوّن. جرّب مكوّن ThreeUI آخر أو تحقق من الملفات المطلوبة.</p>;
    return this.props.children;
  }
}

function App() {
  const [threeVisible, setThreeVisible] = useState(false);
  return (
    <main>
      <p className="muted">HAMDI PHOTOGRAPHY / UI LAB</p>
      <h1>تجارب التصميم بعيدًا عن الموقع المباشر</h1>
      <p>مساحة تطوير مستقلة لتجربة ThreeUI وSkiper UI. لا تغيّر «نور» أو الحجز أو خدمات الموقع.</p>
      <div className="lab-actions">
        <button type="button" onClick={() => setThreeVisible(value => !value)}>
          {threeVisible ? 'إخفاء معاينة ThreeUI' : 'عرض مكوّن ThreeUI'}
        </button>
      </div>
      {threeVisible && (
        <section className="lab-panel" aria-label="معاينة ThreeUI">
          <p>معاينة مكوّن AtTheHorizon من مكتبة ThreeUI Community.</p>
          <div className="lab-demo">
            <DemoErrorBoundary>
              <Suspense fallback={<p role="status">جارٍ تحميل المكوّن...</p>}>
                <AtTheHorizon />
              </Suspense>
            </DemoErrorBoundary>
          </div>
        </section>
      )}
      <section className="lab-panel">
        <h2>Skiper UI</h2>
        <p>بعد التثبيت المحلي، شغّل <code>npm run add:skiper</code> لإضافة المكوّن المجاني عبر مكتبة shadcn. بعض المكوّنات تتطلب ترخيص Pro.</p>
        <small>Free Skiper UI components require attribution: skiper-ui.com.</small>
      </section>
      <section className="lab-panel">
        <h2>Animmaster Lib</h2>
        <p>المكتبة تبيع ملفات مكوّنات مستقلة، وليست حزمة npm عامة. تحتاج ملفات المكوّن المرخّص لاستخدامه هنا.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
