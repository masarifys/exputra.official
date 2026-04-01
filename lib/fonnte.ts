export async function sendWhatsAppMessage(target: string, message: string) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    console.warn('FONNTE_TOKEN is not set. WhatsApp message not sent.');
    return;
  }

  // Format phone number: remove non-digits, ensure it starts with country code or 0
  let formattedTarget = target.replace(/[^0-9]/g, '');
  if (formattedTarget.startsWith('0')) {
    formattedTarget = '62' + formattedTarget.slice(1);
  } else if (!formattedTarget.startsWith('62')) {
    formattedTarget = '62' + formattedTarget;
  }

  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: formattedTarget,
        message: message,
        countryCode: '62',
      })
    });
    
    const data = await res.json();
    if (!data.status) {
      console.warn('Fonnte API Warning:', data.reason || data);
    }
    return data;
  } catch (error) {
    console.error('Fonnte request failed:', error);
  }
}
