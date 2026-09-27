import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { paymentsApi } from '../api';

export const PaymentStatus = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  
  useEffect(() => {
    // Get domain_id from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const domainIdStr = urlParams.get('domain_id');
    
    if (!domainIdStr) {
      setStatus('failed');
      return;
    }
    
    const domainId = parseInt(domainIdStr);
    let attempts = 0;
    
    const checkPayment = async () => {
      try {
        const res = await paymentsApi.checkStatus(domainId);
        if (res.is_active) {
          setStatus('success');
          // Redirect to home after 2 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          if (attempts < 15) {
            attempts++;
            setTimeout(checkPayment, 3000); // Check every 3 seconds
          } else {
            setStatus('failed');
          }
        }
      } catch (error) {
        if (attempts < 15) {
          attempts++;
          setTimeout(checkPayment, 3000);
        } else {
          setStatus('failed');
        }
      }
    };
    
    checkPayment();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      {status === 'loading' && (
        <>
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">To'lov holati tekshirilmoqda...</h2>
          <p className="text-gray-500 mt-2">Iltimos, kuting, bu biroz vaqt olishi mumkin.</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">To'lov muvaffaqiyatli!</h2>
          <p className="text-gray-500 mt-2">Domen faollashtirildi. Asosiy sahifaga qaytarilyapsiz...</p>
        </>
      )}
      {status === 'failed' && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Xatolik</h2>
          <p className="text-gray-500 mt-2">To'lovni tasdiqlashda xatolik yuz berdi yoki vaqt tugadi.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Bosh sahifaga qaytish
          </button>
        </>
      )}
    </div>
  );
};
