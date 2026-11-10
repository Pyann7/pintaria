/**
 * EduXPlay 3D - Universal Realtime Network Adapter
 * Mendukung Firebase Realtime Database (Multi-Device Internet)
 * dengan Fallback Otomatis ke BroadcastChannel (Lokal Multi-Tab).
 */

const RoomNet = (() => {
  let activeNet = null;

  async function join(roomCode, isHost, initialPresence) {
    if (activeNet) {
      try { activeNet.leave(); } catch (_) {}
      activeNet = null;
    }

    const cleanCode = String(roomCode).trim().toUpperCase();
    const isFirebase = typeof firebase !== 'undefined' && window.isFirebaseConfigured && window.isFirebaseConfigured();

    if (isFirebase) {
      try {
        activeNet = await joinFirebase(cleanCode, isHost, initialPresence);
        return activeNet;
      } catch (err) {
        console.warn('Gagal koneksi ke Firebase Realtime DB, beralih ke BroadcastChannel:', err);
      }
    }

    // Fallback otomatis ke BroadcastChannel lokal
    activeNet = joinBroadcastChannel(cleanCode, isHost, initialPresence);
    return activeNet;
  }

  // -------------------------------------------------------------
  // IMPLEMENTASI 1: FIREBASE REALTIME DATABASE (INTERNET MULTI-DEVICE)
  // -------------------------------------------------------------
  async function joinFirebase(roomCode, isHost, initialPresence) {
    const cfg = window.getFirebaseConfig();
    if (!firebase.apps.length) {
      firebase.initializeApp(cfg);
    }
    const db = firebase.database();
    const roomRef = db.ref('rooms/' + roomCode);

    const myId = isHost ? 'host' : 's_' + Math.random().toString(36).substring(2, 8);
    const handlers = { g: [], peers: [], kick: [] };

    let currentPeers = [];
    let isLeaving = false;

    // Cek keberadaan ruang jika sebagai siswa
    if (!isHost) {
      const snap = await roomRef.child('host').once('value');
      if (!snap.exists()) {
        throw new Error(`Ruang dengan kode "${roomCode}" tidak ditemukan atau belum dibuka oleh Guru.`);
      }

      const playersSnap = await roomRef.child('players').once('value');
      const curCount = playersSnap.numChildren();
      if (curCount >= 30) {
        throw new Error('Maaf, ruang kelas sudah penuh (Maksimal 30 siswa).');
      }
    }

    // Daftarkan presence diri sendiri
    const myRef = isHost ? roomRef.child('host') : roomRef.child('players/' + myId);
    await myRef.set({
      id: myId,
      pr: initialPresence,
      ts: firebase.database.ServerValue.TIMESTAMP
    });
    myRef.onDisconnect().remove();

    // Listener untuk data pemain dalam ruangan
    const onPeersUpdate = (playersObj, hostObj) => {
      const list = [];
      if (hostObj && hostObj.pr) {
        list.push({
          peer: 'host',
          isMe: isHost,
          presence: hostObj.pr
        });
      }
      if (playersObj) {
        Object.keys(playersObj).forEach(pid => {
          const p = playersObj[pid];
          if (p && p.pr) {
            list.push({
              peer: pid,
              isMe: !isHost && pid === myId,
              presence: p.pr
            });
          }
        });
      }
      currentPeers = list;
      handlers.peers.forEach(cb => {
        try { cb(list); } catch (e) { console.error(e); }
      });
    };

    let cachedPlayers = {};
    let cachedHost = isHost ? { pr: initialPresence } : null;

    roomRef.child('host').on('value', snap => {
      cachedHost = snap.val();
      if (!isHost && !cachedHost && !isLeaving) {
        // Host keluar atau menutup ruangan
        alert('Guru / Host telah menutup ruangan ini.');
        if (activeNet) activeNet.leave();
        if (typeof go === 'function') go('home');
        return;
      }
      onPeersUpdate(cachedPlayers, cachedHost);
    });

    roomRef.child('players').on('value', snap => {
      cachedPlayers = snap.val() || {};
      onPeersUpdate(cachedPlayers, cachedHost);
    });

    // Listener perubahan Game State (G)
    roomRef.child('state').on('value', snap => {
      const val = snap.val();
      if (val) {
        handlers.g.forEach(cb => {
          try { cb({ data: val }); } catch (e) { console.error(e); }
        });
      }
    });

    // Listener kick khusus untuk siswa
    if (!isHost) {
      roomRef.child('kicked/' + myId).on('value', snap => {
        if (snap.exists() && snap.val() === true) {
          alert('Kamu telah dikeluarkan dari ruang kelas oleh Guru.');
          if (activeNet) activeNet.leave();
          if (typeof go === 'function') go('home');
        }
      });
    }

    const netInstance = {
      isOnline: true,
      channelType: 'firebase',
      code: roomCode,
      peer: myId,
      peers: () => currentPeers,
      presence: async (prData) => {
        try {
          await myRef.child('pr').update(prData);
        } catch (_) {}
      },
      emit: async (event, data) => {
        if (event === 'g' && isHost) {
          try {
            await roomRef.child('state').set(data);
          } catch (_) {}
        }
      },
      on: (event, cb) => {
        if (handlers[event]) handlers[event].push(cb);
      },
      onPeers: (cb) => {
        handlers.peers.push(cb);
      },
      kick: async (peerId) => {
        if (!isHost || peerId === 'host') return;
        try {
          await roomRef.child('kicked/' + peerId).set(true);
          await roomRef.child('players/' + peerId).remove();
        } catch (_) {}
      },
      leave: () => {
        isLeaving = true;
        try {
          roomRef.child('host').off();
          roomRef.child('players').off();
          roomRef.child('state').off();
          if (isHost) {
            roomRef.remove();
          } else {
            myRef.remove();
          }
        } catch (_) {}
        activeNet = null;
      }
    };

    return netInstance;
  }

  // -------------------------------------------------------------
  // IMPLEMENTASI 2: BROADCAST CHANNEL (LOKAL MULTI-TAB ZERO CONFIG)
  // -------------------------------------------------------------
  function joinBroadcastChannel(roomCode, isHost, initialPresence) {
    const channelName = 'eduxplay_room_' + roomCode;
    const bc = new BroadcastChannel(channelName);
    const myId = isHost ? 'host' : 's_' + Math.random().toString(36).substring(2, 8);

    const handlers = { g: [], peers: [], kick: [] };
    const peerMap = new Map();

    // Masukkan diri sendiri
    peerMap.set(myId, {
      peer: myId,
      isMe: true,
      presence: { ...initialPresence },
      lastSeen: Date.now()
    });

    const triggerPeers = () => {
      const list = Array.from(peerMap.values()).map(p => ({
        peer: p.peer,
        isMe: p.peer === myId,
        presence: p.presence
      }));
      handlers.peers.forEach(cb => {
        try { cb(list); } catch (e) { console.error(e); }
      });
    };

    // Bersihkan peer yang disconnect / tab ditutup
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      peerMap.forEach((val, id) => {
        if (id !== myId && now - val.lastSeen > 4000) {
          peerMap.delete(id);
          changed = true;
        }
      });
      if (changed) triggerPeers();
    }, 1200);

    // Heartbeat ping
    const pingInterval = setInterval(() => {
      const me = peerMap.get(myId);
      if (me) {
        bc.postMessage({
          type: 'ping',
          peerId: myId,
          presence: me.presence
        });
      }
    }, 1000);

    bc.onmessage = (ev) => {
      const msg = ev.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'ping' || msg.type === 'presence') {
        peerMap.set(msg.peerId, {
          peer: msg.peerId,
          isMe: false,
          presence: msg.presence,
          lastSeen: Date.now()
        });
        triggerPeers();
      } else if (msg.type === 'state') {
        handlers.g.forEach(cb => {
          try { cb({ data: msg.data }); } catch (e) { console.error(e); }
        });
      } else if (msg.type === 'kick' && msg.target === myId) {
        alert('Kamu telah dikeluarkan dari ruangan oleh Guru.');
        if (activeNet) activeNet.leave();
        if (typeof go === 'function') go('home');
      } else if (msg.type === 'leave') {
        if (msg.peerId === 'host' && !isHost) {
          alert('Guru / Host telah menutup ruangan ini.');
          if (activeNet) activeNet.leave();
          if (typeof go === 'function') go('home');
          return;
        }
        if (peerMap.delete(msg.peerId)) {
          triggerPeers();
        }
      }
    };

    // Kirim pesan join pertama kali
    bc.postMessage({
      type: 'ping',
      peerId: myId,
      presence: initialPresence
    });

    const netInstance = {
      isOnline: false,
      channelType: 'broadcast',
      code: roomCode,
      peer: myId,
      peers: () => Array.from(peerMap.values()).map(p => ({
        peer: p.peer,
        isMe: p.peer === myId,
        presence: p.presence
      })),
      presence: async (prData) => {
        const me = peerMap.get(myId);
        if (me) {
          Object.assign(me.presence, prData);
          bc.postMessage({
            type: 'presence',
            peerId: myId,
            presence: me.presence
          });
          triggerPeers();
        }
      },
      emit: async (event, data) => {
        if (event === 'g') {
          bc.postMessage({
            type: 'state',
            data: data
          });
        }
      },
      on: (event, cb) => {
        if (handlers[event]) handlers[event].push(cb);
      },
      onPeers: (cb) => {
        handlers.peers.push(cb);
      },
      kick: async (peerId) => {
        if (!isHost || peerId === 'host') return;
        peerMap.delete(peerId);
        triggerPeers();
        bc.postMessage({
          type: 'kick',
          target: peerId
        });
      },
      leave: () => {
        clearInterval(cleanupInterval);
        clearInterval(pingInterval);
        try {
          bc.postMessage({ type: 'leave', peerId: myId });
          bc.close();
        } catch (_) {}
        activeNet = null;
      }
    };

    return netInstance;
  }

  return {
    join
  };
})();
