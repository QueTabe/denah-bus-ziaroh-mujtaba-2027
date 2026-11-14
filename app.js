// ============================================================
// 1. KONFIGURASI SUPABASE
// ============================================================

// Ambil URL dan publishable key dari:
// Supabase > Project Settings > API
const SUPABASE_URL = "https://etdaoxhocwaxboglhkzm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iQSudNjcuy4ICnZdhjy6XA_f9xw_KQa";

// Periksa apakah konfigurasi Supabase sudah diisi.
const configured =
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("YOUR-PROJECT") &&
    !SUPABASE_ANON_KEY.includes("YOUR_");

// Buat koneksi ke Supabase jika library Supabase tersedia.
const db =
    configured && window.supabase
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        : null;


// ============================================================
// 2. DATA AWAL KURSI BUS
// ============================================================

// Format data:
// nomorKursi: [namaPenumpang, statusKursi, warnaKursi]
//
// Status: filled = terisi, reserved = khusus, available = kosong
// Warna : green = hijau, yellow = kuning, peach = peach

const initial = {
    1: ["Ust. Rovi’I H.", "filled", "green"],
    2: ["Ust. Ubaidah", "filled", "green"],
    3: ["Gus Faiz", "filled", "green"],
    4: ["Abah Mundzir", "filled", "green"],
    5: ["Abah Mundzir", "filled", "green"],

    6: ["Ust. Muttaqin", "filled", "green"],
    7: ["Ust. Sukron F.", "filled", "green"],
    8: ["Penderek", "reserved", "yellow"],
    9: ["Pelapor", "reserved", "yellow"],
    10: ["Pelapor", "reserved", "yellow"],

    11: ["Nurul", "filled", ""],
    12: ["Asfiya’", "filled", ""],
    13: ["Nahar", "filled", ""],
    14: ["Nahar", "filled", ""],
    15: ["Nahar", "filled", ""],

    16: ["Sela", "filled", ""],
    17: ["Robi’ah", "filled", ""],
    18: ["Hariri", "filled", "peach"],
    19: ["Nahar", "filled", "peach"],
    20: ["Dimas", "filled", ""],

    21: ["", "available", ""],
    22: ["", "available", ""],
    23: ["", "available", ""],
    24: ["", "available", ""],
    25: ["Pak Khanif", "filled", ""],

    26: ["", "available", ""],
    27: ["", "available", ""],
    28: ["", "available", ""],
    29: ["", "available", ""],
    30: ["", "available", ""],

    31: ["", "available", ""],
    32: ["", "available", ""],
    33: ["Zaim", "filled", ""],
    34: ["Mahbub", "filled", ""],
    35: ["Ihsan", "filled", ""],

    36: ["", "available", ""],
    37: ["", "available", ""],
    38: ["Fahmi", "filled", ""],
    39: ["Zaki", "filled", ""],
    40: ["Qosik", "filled", ""],

    41: ["", "available", ""],
    42: ["Aria", "filled", ""],
    43: ["", "available", "peach"],
    44: ["Akmal", "filled", ""],
    45: ["Budiman", "filled", ""],

    46: ["Pak Basyar", "filled", ""],
    47: ["Pak Slamet", "filled", ""],
    48: ["", "available", "peach"],
    49: ["", "available", "peach"],
    50: ["", "available", "peach"],

    51: ["", "available", "peach"],
    52: ["", "available", "peach"],
    53: ["", "available", "peach"],
    54: ["", "available", "peach"],
    55: ["", "available", "peach"],
    56: ["", "available", "peach"],
    57: ["", "available", "peach"],
    58: ["", "available", "peach"],
    59: ["", "available", "peach"]
};


// Ubah data awal menjadi objek agar mudah dikelola oleh JavaScript.
let seats = Object.fromEntries(
    Object.entries(initial).map(([number, value]) => [
        number,
        {
            number: Number(number),
            name: value[0],
            status: value[1],
            color: value[2]
        }
    ])
);


// ============================================================
// 3. VARIABEL GLOBAL DAN FUNGSI BANTU
// ============================================================

let selected = null;  // Nomor kursi yang sedang dipilih.
let isAdmin = false;  // Menandakan apakah admin sudah login.
let channel = null;   // Saluran pembaruan realtime Supabase.
let lastSync = null;  // Waktu terakhir data berhasil disinkronkan.

// Mempermudah pemanggilan elemen HTML berdasarkan ID.
const $ = (id) => document.getElementById(id);


// Mengamankan teks sebelum dimasukkan ke dalam HTML.
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


// Mengatur indikator koneksi database.
function setConnection(state, label) {
    $("connection").className = "connection " + state;
    $("connection").lastChild.textContent = " " + label;
}


// Mengatur pesan pada panel admin.
// Setiap pesan baru akan menghapus status warna sebelumnya.
function setSaveMessage(message, type = "") {
    const messageElement = $("saveMsg");

    messageElement.textContent = message;
    messageElement.classList.remove("success");

    if (type === "success") {
        messageElement.classList.add("success");
    }
}


// ============================================================
// 4. MEMBUAT TOMBOL KURSI
// ============================================================

function seatButton(number) {
    const seat = seats[number];
    const button = document.createElement("button");

    button.type = "button";
    button.className = `seat ${seat.status} ${seat.color || ""}`;

    button.innerHTML = `
        <span class="num">${number}</span>
        <span class="name">${escapeHtml(seat.name)}</span>
    `;

    button.setAttribute(
        "aria-label",
        `Kursi ${number}${seat.name ? ", " + seat.name : ""}, status ${seat.status}`
    );

    button.title = `Kursi ${number}${seat.name ? " - " + seat.name : ""}`;

    // Ketika kursi diklik, jalankan fungsi chooseSeat().
    button.onclick = () => chooseSeat(number);

    return button;
}


// ============================================================
// 5. MENAMPILKAN DENAH KURSI
// ============================================================

function render() {
    const grid = $("seatGrid");
    grid.innerHTML = "";

    // Susunan kursi utama. null berarti lorong tengah bus.
    const rows = [
        [1, 2, null, 3, 4, 5],
        [6, 7, null, 8, 9, 10],
        [11, 12, null, 13, 14, 15],
        [16, 17, null, 18, 19, 20],
        [21, 22, null, 23, 24, 25],
        [26, 27, null, 28, 29, 30],
        [31, 32, null, 33, 34, 35],
        [36, 37, null, 38, 39, 40],
        [41, 42, null, 43, 44, 45],
        [46, 47, null, 48, 49, 50]
    ];

    // Tampilkan kursi utama dan lorong tengah.
    rows.forEach((row, rowIndex) => {
        row.forEach((number, columnIndex) => {
            if (number === null) {
                const aisle = document.createElement("div");

                aisle.className = "aisle";
                aisle.style.gridColumn = String(columnIndex + 1);
                aisle.style.gridRow = String(rowIndex + 1);

                grid.append(aisle);
            } else {
                grid.append(seatButton(number));
            }
        });
    });

    // Tampilkan kursi belakang nomor 51 sampai 53.
    $("backRight").innerHTML = "";

    [51, 52, 53].forEach((number) => {
        $("backRight").append(seatButton(number));
    });

    // Tampilkan baris kursi paling belakang nomor 54 sampai 59.
    $("backRow").innerHTML = "";

    [54, 55, 56, 57, 58, 59].forEach((number) => {
        $("backRow").append(seatButton(number));
    });

    // Perbarui jumlah kursi.
    $("seatCount").textContent = `${Object.keys(seats).length} kursi`;
}


// ============================================================
// 6. MEMBUKA DAN MENUTUP POPUP
// ============================================================

function showModal(id) {
    $(id).classList.add("show");
    $(id).setAttribute("aria-hidden", "false");
}

function hideModal(id) {
    $(id).classList.remove("show");
    $(id).setAttribute("aria-hidden", "true");
}


// ============================================================
// 7. MEMILIH KURSI
// ============================================================

function chooseSeat(number) {
    selected = number;

    const seat = seats[number];

    // Jika admin sudah login, langsung buka formulir kursi yang dipilih.
    if (isAdmin) {
        $("editNumber").value = number;
        $("editName").value = seat.name;
        $("editStatus").value = seat.status;
        $("editColor").value = seat.color || "";

        setSaveMessage("");
        showModal("adminModal");

        // Arahkan fokus ke kolom nama agar admin bisa langsung mengetik.
        $("editName").focus();
        return;
    }

    // Jika pengunjung biasa, tampilkan informasi kursi.
    $("detailTitle").textContent = `Kursi ${number}`;

    $("detailInfo").textContent = seat.name
        ? `${seat.name} · ${
            seat.status === "reserved"
                ? "Khusus"
                : seat.status === "filled"
                    ? "Terisi"
                    : "Kosong"
        }`
        : "Kursi ini belum diisi.";

    showModal("detailModal");
}


// ============================================================
// 8. MENGAMBIL DATA DARI SUPABASE
// ============================================================

async function fetchSeats() {
    if (!db) {
        setConnection("offline", "Mode lokal");
        return;
    }

    setConnection("", "Mengambil data…");

    const { data, error } = await db
        .from("bus_seats")
        .select("number,name,status,color")
        .order("number");

    // Jika terjadi kesalahan saat mengambil data.
    if (error) {
        console.error(error);
        setConnection("offline", "Database belum tersambung");
        return;
    }

    // Masukkan data Supabase ke dalam objek seats.
    if (data?.length) {
        data.forEach((row) => {
            seats[row.number] = {
                number: row.number,
                name: row.name || "",
                status: row.status || "available",
                color: row.color || ""
            };
        });
    }

    render();

    lastSync = new Date();

    $("lastUpdated").textContent =
        "Data tersinkronisasi: " + lastSync.toLocaleString("id-ID");

    setConnection("online", "Online");
}


// ============================================================
// 9. MEMERIKSA HAK AKSES ADMIN
// ============================================================

async function checkAdmin(session) {
    isAdmin = false;

    if (session?.user && db) {
        const { data, error } = await db
            .from("admin_users")
            .select("user_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

        if (error) {
            console.warn("Pemeriksaan admin:", error.message);
        }

        isAdmin = !!data;
    }

    // Atur panel yang terlihat berdasarkan status admin.
    $("loginPanel").hidden = isAdmin;
    $("editorPanel").hidden = !isAdmin;

    $("adminOpen").textContent = isAdmin
        ? "Panel Admin"
        : "Login Admin";

    // Jika akun bukan admin, keluarkan dari sesi login.
    if (session && !isAdmin) {
        $("loginMsg").textContent =
            "Akun berhasil login, tetapi belum diberi hak admin.";

        await db.auth.signOut();
    }
}


// ============================================================
// 10. PEMBARUAN DATA SECARA REALTIME
// ============================================================

function subscribeRealtime() {
    if (!db) return;

    // Hapus saluran sebelumnya jika sudah ada.
    if (channel) {
        db.removeChannel(channel);
    }

    channel = db
        .channel("public-bus-seats")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "bus_seats"
            },
            (payload) => {
                const row = payload.new;

                // Jika data kursi dihapus dari database.
                if (payload.eventType === "DELETE") {
                    delete seats[payload.old.number];
                }

                // Jika data kursi ditambahkan atau diperbarui.
                else if (row?.number) {
                    seats[row.number] = {
                        number: row.number,
                        name: row.name || "",
                        status: row.status || "available",
                        color: row.color || ""
                    };
                }

                render();

                $("lastUpdated").textContent =
                    "Denah diperbarui langsung: " +
                    new Date().toLocaleTimeString("id-ID");
            }
        )
        .subscribe((status) => {
            if (status === "SUBSCRIBED") {
                setConnection("online", "Realtime aktif");
            } else if (
                status === "CHANNEL_ERROR" ||
                status === "TIMED_OUT"
            ) {
                setConnection("offline", "Realtime terputus");
            }
        });
}


// ============================================================
// 11. MENYIMPAN PERUBAHAN KURSI
// ============================================================

async function saveSeat() {
    // Pastikan admin sudah login dan kursi sudah dipilih.
    if (!isAdmin || !selected) {
        setSaveMessage(
            "Login admin dan pilih kursi terlebih dahulu."
        );
        return;
    }

    // Hapus warna pesan sebelumnya.
    setSaveMessage("");

    // Ambil nilai dari formulir admin.
    const row = {
        number: selected,
        name: $("editName").value.trim(),
        status: $("editStatus").value,
        color: $("editColor").value
    };

    // Pastikan koneksi database tersedia.
    if (!db) {
        setSaveMessage("Database belum dikonfigurasi.");
        return;
    }

    // Nonaktifkan tombol selama proses penyimpanan.
    $("saveSeat").disabled = true;
    setSaveMessage("Menyimpan…");

    // Simpan data kursi ke tabel bus_seats.
    const { error } = await db
        .from("bus_seats")
        .upsert(row, { onConflict: "number" });

    $("saveSeat").disabled = false;

    // Jika penyimpanan gagal, tampilkan pesan merah.
    if (error) {
        setSaveMessage("Gagal menyimpan: " + error.message);
        return;
    }

    // Jika berhasil, perbarui data lokal dan tampilan denah.
    seats[selected] = row;
    render();

    // Tampilkan pesan berhasil dengan class success (warna hijau).
    setSaveMessage(
        "Tersimpan. Pengunjung akan menerima pembaruan realtime.",
        "success"
    );
}


// ============================================================
// 12. IMPOR DATA DARI FILE JSON
// ============================================================

async function importJson(file) {
    try {
        const rows = JSON.parse(await file.text());

        if (!Array.isArray(rows)) {
            throw new Error("Format JSON harus berupa array.");
        }

        // Baca setiap data kursi dari file JSON.
        for (const item of rows) {
            const number = Number(item.number);

            // Abaikan nomor kursi yang tidak valid.
            if (
                !Number.isInteger(number) ||
                number < 1 ||
                number > 59
            ) {
                continue;
            }

            // Rapikan dan validasi nilai data kursi.
            const row = {
                number,
                name: String(item.name || ""),
                status: ["available", "filled", "reserved"].includes(item.status)
                    ? item.status
                    : "available",
                color: ["", "green", "yellow", "peach"].includes(item.color)
                    ? item.color
                    : ""
            };

            // Simpan setiap kursi ke Supabase.
            const { error } = await db
                .from("bus_seats")
                .upsert(row, { onConflict: "number" });

            if (error) {
                throw error;
            }

            seats[number] = row;
        }

        render();

        // Pesan impor berhasil juga menggunakan warna hijau.
        setSaveMessage(
            "Impor berhasil. Data sudah disimpan.",
            "success"
        );

    } catch (error) {
        // Tampilkan pesan jika proses impor gagal.
        setSaveMessage("Gagal impor: " + error.message);
    }
}


// ============================================================
// 13. EVENT LISTENER / AKSI TOMBOL WEBSITE
// ============================================================

// Tombol untuk membuka panel admin.
$("adminOpen").onclick = () => {
    showModal("adminModal");
};

// Tombol untuk menutup popup.
document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
        hideModal(button.dataset.close);
    });
});

// Tutup popup jika pengguna mengeklik area di luar kotak popup.
document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            hideModal(modal.id);
        }
    });
});


// ============================================================
// 14. PROSES LOGIN ADMIN
// ============================================================

$("loginBtn").onclick = async () => {
    if (!db) {
        $("loginMsg").textContent =
            "Konfigurasi Supabase belum diisi. Baca README.md.";
        return;
    }

    $("loginBtn").disabled = true;
    $("loginMsg").textContent = "Memeriksa akun…";

    const { data, error } = await db.auth.signInWithPassword({
        email: $("email").value.trim(),
        password: $("password").value
    });

    $("loginBtn").disabled = false;

    // Jika login gagal.
    if (error) {
        $("loginMsg").textContent = error.message;
        return;
    }

    // Periksa apakah akun mempunyai hak akses admin.
    await checkAdmin(data.session);

    if (isAdmin) {
        $("loginMsg").textContent = "Login admin berhasil.";
        await fetchSeats();
    }
};


// ============================================================
// 15. LOGOUT DAN TOMBOL PENGELOLAAN KURSI
// ============================================================

// Tombol logout admin.
$("logoutBtn").onclick = async () => {
    if (db) {
        await db.auth.signOut();
    }

    isAdmin = false;

    $("loginPanel").hidden = false;
    $("editorPanel").hidden = true;
    $("adminOpen").textContent = "Login Admin";
    $("password").value = "";
};

// Tombol simpan perubahan kursi.
$("saveSeat").onclick = saveSeat;

// Tombol kosongkan kursi.
$("clearSeat").onclick = () => {
    if (!selected) {
        setSaveMessage("Pilih kursi yang ingin dikosongkan terlebih dahulu.");
        return;
    }

    const confirmed = window.confirm(
        `Yakin ingin mengosongkan kursi ${selected}? Nama penumpang pada kursi ini akan dihapus.`
    );

    if (!confirmed) return;

    $("editName").value = "";
    $("editStatus").value = "available";
    $("editColor").value = "";

    saveSeat();
};

// Tombol cetak denah.
$("printBtn").onclick = () => {
    window.print();
};


// ============================================================
// 16. EKSPOR DAN IMPOR DATA
// ============================================================

// Ekspor seluruh data kursi menjadi file JSON.
$("exportBtn").onclick = () => {
    const data = JSON.stringify(
        Object.values(seats).sort((a, b) => a.number - b.number),
        null,
        2
    );

    const blob = new Blob([data], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "cadangan-denah-bus.json";
    link.click();

    URL.revokeObjectURL(url);
};

// Jalankan proses impor ketika file dipilih.
$("importFile").onchange = async (event) => {
    const file = event.target.files?.[0];

    if (file) {
        await importJson(file);
        event.target.value = "";
    }
};


// ============================================================
// 17. INISIALISASI WEBSITE
// ============================================================

// Tampilkan denah awal ketika website dibuka.
render();

// Jika Supabase sudah dikonfigurasi, hubungkan database.
if (db) {
    fetchSeats();
    subscribeRealtime();

    // Periksa apakah ada sesi admin yang masih aktif.
    db.auth.getSession().then(async ({ data }) => {
        if (data.session) {
            await checkAdmin(data.session);
        }
    });

    // Pantau perubahan status login dan logout.
    db.auth.onAuthStateChange((_event, session) => {
        setTimeout(() => checkAdmin(session), 0);
    });

} else {
    // Jika Supabase belum dikonfigurasi, gunakan mode lokal.
    setConnection("offline", "Belum dikonfigurasi");

    $("lastUpdated").textContent =
        "Menampilkan data contoh lokal. Hubungkan Supabase agar perubahan tersimpan online.";
}
