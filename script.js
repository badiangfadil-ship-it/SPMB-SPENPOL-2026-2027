/**
 * JEMBATAN INTEGRASI FETCH API (FRONTEND TO BACKEND COUPLING)
 * Mengontrol Request Lintas Peladen Antara GitHub Dan Google Apps Script RESTful API
 */

// PENTING: Ganti URL di bawah ini dengan URL hasil Deploy baru dari Google Apps Script Anda!
const API_URL = "https://script.google.com/macros/s/AKfycbzsK-IZMyF_-NUsVTOIM-EJ5Ean_JG6BkFrAWLcWb9rtg-hmRECw9dT8Eh_jTM24KXX/exec";

async function callBackend(actionName, extraParams = {}) {
  const payload = {
    action: actionName,
    ...extraParams
  };

  // Menggunakan metode text/plain guna memotong aturan pemblokiran CORS Preflight Browser
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return await response.json();
}

// ==========================================
// CONTROL INTERFACE LOGIC INDEX.HTML
// ==========================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const targetSec = document.getElementById(`sec-${tabId}`);
  if(targetSec) targetSec.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
  const targetNav = document.getElementById(`nav-${tabId}`);
  if(targetNav) targetNav.classList.add('active-nav');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function convertFileToBase64(file) {
  if (!file) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const nisn = document.getElementById('nisn').value;
  const nik = document.getElementById('nik').value;

  if (nisn.length !== 10) return Swal.fire('Validasi Gagal', 'NISN wajib diisi tepat 10 digit!', 'warning');
  if (nik.length !== 16) return Swal.fire('Validasi Gagal', 'NIK wajib diisi tepat 16 digit!', 'warning');

  Swal.fire({
    title: 'Mengunggah Berkas...',
    text: 'Mohon tunggu, dokumen digital sedang dikirim ke cloud storage.',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  try {
    const fileFoto = document.getElementById('fileFoto').files[0];
    const fileKk = document.getElementById('fileKk').files[0];
    const fileAkta = document.getElementById('fileAkta').files[0];
    const fileIjazah = document.getElementById('fileIjazah').files[0];
    const fileKis = document.getElementById('fileKis').files[0];

    const formData = {
      nama: document.getElementById('nama').value,
      nisn: nisn,
      nik: nik,
      tempatLahir: document.getElementById('tempatLahir').value,
      tanggalLahir: document.getElementById('tanggalLahir').value,
      jk: document.getElementById('jk').value,
      agama: document.getElementById('agama').value,
      alamat: document.getElementById('alamat').value,
      asalSekolah: document.getElementById('asalSekolah').value,
      namaAyah: document.getElementById('namaAyah').value,
      namaIbu: document.getElementById('namaIbu').value,
      hpOrangTua: document.getElementById('hpOrangTua').value,
      email: document.getElementById('email').value,
      fileFoto: await convertFileToBase64(fileFoto),
      fileKk: await convertFileToBase64(fileKk),
      fileAkta: await convertFileToBase64(fileAkta),
      fileIjazah: await convertFileToBase64(fileIjazah),
      fileKis: fileKis ? await convertFileToBase64(fileKis) : ""
    };

    const response = await callBackend('submitPendaftaran', { formData: formData });
    Swal.close();

    if (response.success) {
      Swal.fire('Registrasi Berhasil!', `Selamat! Anda berhasil terdaftar dengan nomor pendaftaran: ${response.id}. Bukti pendaftaran PDF dikirimkan secara otomatis ke email Anda.`, 'success');
      document.getElementById('ppdb-form').reset();
      switchTab('beranda');
    } else {
      Swal.fire('Proses Pendaftaran Gagal', response.message, 'error');
    }
  } catch (err) {
    Swal.fire('Koneksi Error', 'Terjadi kesalahan interkoneksi server: ' + err.toString(), 'error');
  }
}

// ==========================================
// CONTROL INTERFACE LOGIC ADMIN.HTML
// ==========================================
async function handleAdminLogin(e) {
  e.preventDefault();
  Swal.showLoading();
  const u = document.getElementById('adminUser').value;
  const p = document.getElementById('adminPass').value;

  try {
    const res = await callBackend('verifyAdminLogin', { username: u, password: p });
    Swal.close();
    if (res.success) {
      document.getElementById('login-overlay').classList.add('hidden');
      document.getElementById('admin-main-ui').classList.remove('hidden');
      fetchAdminStats();
    } else {
      Swal.fire('Login Gagal', res.message, 'error');
    }
  } catch (err) {
    Swal.fire('Error Auth', err.toString(), 'error');
  }
}

async function fetchAdminStats() {
  try {
    const res = await callBackend('getDashboardData');
    document.getElementById('st-total').innerText = res.stats.total;
    document.getElementById('st-lulus').innerText = res.stats.diterima;
    document.getElementById('st-proses').innerText = res.stats.pending;
    document.getElementById('st-tolak').innerText = res.stats.ditolak;
    renderAdminTable(res.applicants);
  } catch (e) {
    console.log("Error Ambil Data Dashboard: " + e.toString());
  }
}

function renderAdminTable(data) {
  const tbody = document.getElementById('table-body');
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-400">Belum ada data pendaftar baru masuk.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(item => {
    let statusStyle = item.status === 'Diterima' ? 'bg-emerald-100 text-emerald-700' : (item.status === 'Ditolak' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700');
    return `
      <tr class="hover:bg-slate-50 border-b">
        <td class="py-4 px-5"><span class="font-bold text-gray-950 block">${item.id}</span><span class="text-[11px] text-gray-400 block">${item.tanggal}</span></td>
        <td class="py-4 px-5 font-bold text-gray-900">${item.nama}</td>
        <td class="py-4 px-5"><b>${item.nisn}</b><br><span class="text-xs text-gray-400 uppercase font-semibold">${item.asalSekolah}</span></td>
        <td class="py-4 px-5"><div class="flex justify-center space-x-1.5">
          <a href="${item.foto}" target="_blank" class="w-7 h-7 border rounded flex items-center justify-center text-blue-500 hover:bg-blue-50" title="Foto"><i class="fa-solid fa-image"></i></a>
          <a href="${item.kk}" target="_blank" class="w-7 h-7 border rounded flex items-center justify-center text-emerald-500 hover:bg-emerald-50" title="KK"><i class="fa-solid fa-file-invoice"></i></a>
          <a href="${item.akta}" target="_blank" class="w-7 h-7 border rounded flex items-center justify-center text-amber-500 hover:bg-amber-50" title="Akta"><i class="fa-solid fa-cake-candles"></i></a>
          <a href="${item.ijazah}" target="_blank" class="w-7 h-7 border rounded flex items-center justify-center text-purple-500 hover:bg-purple-50" title="Ijazah"><i class="fa-solid fa-graduation-cap"></i></a>
          ${item.kis !== 'Tidak Ada' ? `<a href="${item.kis}" target="_blank" class="w-7 h-7 border rounded flex items-center justify-center text-red-500 hover:bg-red-50" title="KIS/PKH"><i class="fa-solid fa-credit-card"></i></a>` : ''}
        </div></td>
        <td class="py-4 px-5 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-bold ${statusStyle}">${item.status}</span></td>
        <td class="py-4 px-5 text-center"><div class="flex justify-center space-x-1">
          <button onclick="changeStatus('${item.id}', 'Diterima')" class="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-2 py-1 rounded font-bold">Terima</button>
          <button onclick="changeStatus('${item.id}', 'Ditolak')" class="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">Tolak</button>
        </div></td>
      </tr>
    `;
  }).join('');
}

async function changeStatus(id, targetStatus) {
  Swal.fire({
    title: 'Konfirmasi Aksi',
    text: `Ubah status kelulusan berkas pendaftar ${id} menjadi [${targetStatus}]?`,
    icon: 'question',
    showCancelButton: true
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.showLoading();
      const res = await callBackend('updateApplicantStatus', { id: id, status: targetStatus });
      if(res.success) {
        Swal.fire('Berhasil', 'Status kelulusan berkas pendaftar diperbarui.', 'success');
        fetchAdminStats();
      } else {
        Swal.fire('Gagal', res.message, 'error');
      }
    }
  });
}

function searchTable() {
  const query = document.getElementById("tableSearch").value.toLowerCase();
  const rows = document.getElementById("table-body").getElementsByTagName("tr");
  for (let i = 0; i < rows.length; i++) {
    rows[i].style.display = rows[i].innerText.toLowerCase().includes(query) ? "" : "none";
  }
}
