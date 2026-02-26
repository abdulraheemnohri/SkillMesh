import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { multiaddr } from '@multiformats/multiaddr'
import { peerIdFromString } from '@libp2p/peer-id'
import { createNode } from './libp2p-network.js'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tasksPath = process.env.TASKS_PATH || path.join(__dirname, 'tasks.json')
const profilePath = process.env.PROFILE_PATH || path.join(__dirname, 'profile.json')
const chatsPath = path.join(__dirname, 'chats.json')

let tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'))
let profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
let chats = JSON.parse(fs.readFileSync(chatsPath, 'utf8'))

const app = express()
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'frontend')))
app.use(express.json())
// Simple CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
const bootstrapNodes = process.env.BOOTSTRAP ? process.env.BOOTSTRAP.split(',') : []
const p2pNode = await createNode(bootstrapNodes)
await p2pNode.start()
const peerIdStr = p2pNode.peerId.toString()
console.log('P2P Node started, id:', peerIdStr)

// Ensure unique ID matches PeerID
if (profile.id !== peerIdStr) {
  profile.id = peerIdStr
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2))
}

const TOPIC_TASKS = 'skillmesh-tasks'
const TOPIC_HEARTBEAT = 'skillmesh-heartbeat'
const activePeers = new Map()

p2pNode.services.pubsub.subscribe(TOPIC_TASKS)
p2pNode.services.pubsub.subscribe(TOPIC_HEARTBEAT)

p2pNode.services.pubsub.addEventListener('message', (evt) => {
  try {
    const data = JSON.parse(uint8ArrayToString(evt.detail.data))
    if (evt.detail.topic === TOPIC_TASKS) {
      handleP2PMessage(data)
    } else if (evt.detail.topic === TOPIC_HEARTBEAT) {
      handleHeartbeat(data)
    }
  } catch (e) {
    console.error('P2P Message Error:', e.message)
  }
})

function handleP2PMessage(message) {
  let changed = false
  if (message.type === 'task-broadcast') {
    if (!tasks.find(t => t.id === message.task.id)) { tasks.push(message.task); changed = true; }
  } else if (message.type === 'contact-request') {
    const task = tasks.find(t => t.id === message.taskId)
    // Only reveal if we have the number (original gateway) and it is assigned to requester
    if (task && task.mobileNumber && task.assignedTo === message.requesterId) {
      broadcast({
        type: 'contact-response',
        taskId: task.id,
        mobileNumber: task.mobileNumber,
        targetId: message.requesterId
      }, TOPIC_TASKS)
    }
  } else if (message.type === 'contact-response') {
    if (message.targetId === profile.id) {
      const task = tasks.find(t => t.id === message.taskId)
      if (task) {
        task.mobileNumber = message.mobileNumber
        changed = true
      }
    }
  } else if (message.type === 'chat-message') {
    if (!chats[message.taskId]) chats[message.taskId] = []
    // Avoid duplicates
    if (!chats[message.taskId].find(m => m.id === message.id)) {
      chats[message.taskId].push(message)
      fs.writeFileSync(chatsPath, JSON.stringify(chats, null, 2))
    }
  } else if (message.type === 'task-claim') {
    const task = tasks.find(t => t.id === message.taskId)
    if (task) {
      // Conflict resolution: earlier timestamp wins
      if (!task.assignedTo || (message.assignedAt < (task.assignedAt || Infinity))) {
        task.assignedTo = message.assignedTo;
        task.assignedToName = message.assignedToName;
        task.assignedAt = message.assignedAt;
        task.status = 'assigned';
        changed = true;
      }
    }
  } else if (message.type === 'task-complete') {
    const task = tasks.find(t => t.id === message.taskId)
    if (task && task.status !== 'completed') {
      task.status = 'completed';
      changed = true;
    }
  } else if (message.type === 'sync-request') {
    broadcast({ type: 'sync-response', tasks }, TOPIC_TASKS)
  } else if (message.type === 'sync-response') {
    message.tasks.forEach(remoteTask => {
      const localTask = tasks.find(t => t.id === remoteTask.id)
      if (!localTask) {
        tasks.push(remoteTask); changed = true
      } else {
        if (remoteTask.status === 'completed' && localTask.status !== 'completed') {
          localTask.status = 'completed'; localTask.assignedTo = remoteTask.assignedTo; changed = true
        } else if (remoteTask.status === 'assigned') {
          if (!localTask.assignedTo || (remoteTask.assignedAt < (localTask.assignedAt || Infinity))) {
            localTask.status = 'assigned';
            localTask.assignedTo = remoteTask.assignedTo;
            localTask.assignedToName = remoteTask.assignedToName;
            localTask.assignedAt = remoteTask.assignedAt;
            changed = true
          }
        }
      }
    })
  }
  if (changed) fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2))
}

function handleHeartbeat(data) {
  activePeers.set(data.id, {
    ...data,
    lastSeen: Date.now()
  })

  // Auto-connect to discovered addresses
  if (data.addresses && data.id !== profile.id) {
    data.addresses.forEach(async (addr) => {
      try {
        const ma = multiaddr(addr)
        const isConnected = p2pNode.getPeers().some(p => p.toString() === data.id)
        if (!isConnected) {
          await p2pNode.dial(ma)
        }
      } catch (e) {}
    })
  }
}

// Cleanup inactive peers every 30 seconds
setInterval(() => {
  const now = Date.now()
  for (const [id, peer] of activePeers.entries()) {
    if (now - peer.lastSeen > 60000) activePeers.delete(id)
  }
}, 30000)

// Heartbeat broadcast every 15 seconds
setInterval(() => {
  broadcast({
    id: profile.id,
    name: profile.name,
    profession: profile.profession,
    rating: profile.rating,
    completedTasks: profile.completedTasks,
    isAvailable: profile.isAvailable,
    location: `${profile.city}, ${profile.country}`,
    addresses: p2pNode.getMultiaddrs().map(ma => ma.toString())
  }, TOPIC_HEARTBEAT)
}, 15000)

// Initial sync request after a short delay
setTimeout(() => {
  broadcast({ type: 'sync-request' }, TOPIC_TASKS)
}, 2000)

app.get('/api/profile', (req, res) => res.json(profile))
app.post('/api/profile', (req, res) => {
  profile = { ...profile, ...req.body }
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2))
  res.json({ success: true, profile })
})
app.get('/api/tasks', (req, res) => res.json(tasks))
app.get('/api/tasks/history', (req, res) => {
  const history = tasks.filter(t => t.status === 'completed' && t.assignedTo === profile.id)
  res.json(history)
})
app.post('/api/mesh/connect', async (req, res) => {
  try {
    const { multiaddr: maStr } = req.body
    const ma = multiaddr(maStr)
    await p2pNode.dial(ma)
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})
app.get('/api/mesh/stats', (req, res) => {
  const allProfessionals = Array.from(activePeers.values())
  // Include self if it's not already there
  if (!activePeers.has(profile.id)) {
    allProfessionals.push({
      id: profile.id,
      name: profile.name,
      profession: profile.profession,
      rating: profile.rating,
      completedTasks: profile.completedTasks,
      isAvailable: profile.isAvailable,
      location: `${profile.city}, ${profile.country}`
    })
  }
  res.json({
    peerCount: p2pNode.getPeers().length,
    addresses: p2pNode.getMultiaddrs().map(ma => ma.toString()),
    activeProfessionals: allProfessionals
  })
})
app.post('/api/tasks', (req, res) => {
  const task = req.body
  tasks.push(task); fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2))

  // Strip mobile number before broadcast
  const broadcastTask = { ...task }
  delete broadcastTask.mobileNumber

  broadcast({ type: 'task-broadcast', task: broadcastTask }, TOPIC_TASKS)
  res.status(201).json(task)
})

app.get('/api/tasks/:taskId/contact', (req, res) => {
  const task = tasks.find(t => t.id === req.params.taskId)
  if (task) {
    if (task.mobileNumber) {
      return res.json({ mobileNumber: task.mobileNumber })
    }
    // Request from mesh
    broadcast({
      type: 'contact-request',
      taskId: task.id,
      requesterId: profile.id
    }, TOPIC_TASKS)
    res.json({ status: 'requested' })
  } else res.status(404).json({ error: 'Task not found' })
})
app.post('/api/tasks/claim', (req, res) => {
  const task = tasks.find(t => t.id === req.body.taskId)
  if (task && !task.assignedTo) {
    const claimTime = Date.now()
    task.assignedTo = profile.id;
    task.assignedToName = profile.name;
    task.assignedAt = claimTime;
    task.status = 'assigned';
    fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2))
    broadcast({
      type: 'task-claim',
      taskId: req.body.taskId,
      assignedTo: profile.id,
      assignedToName: profile.name,
      assignedAt: claimTime
    }, TOPIC_TASKS)
    res.json({ success: true })
  } else res.status(400).json({ success: false })
})
app.get('/api/chat/:taskId', (req, res) => {
  res.json(chats[req.params.taskId] || [])
})

app.post('/api/chat', (req, res) => {
  const { taskId, text, senderId, senderName } = req.body
  const msg = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    taskId,
    text,
    senderId,
    senderName,
    timestamp: new Date().toISOString()
  }

  if (!chats[taskId]) chats[taskId] = []
  chats[taskId].push(msg)
  fs.writeFileSync(chatsPath, JSON.stringify(chats, null, 2))

  broadcast({ type: 'chat-message', ...msg }, TOPIC_TASKS)
  res.status(201).json(msg)
})

app.post('/api/tasks/complete', (req, res) => {
  const task = tasks.find(t => t.id === req.body.taskId)
  if (task && task.assignedTo === profile.id) {
    task.status = 'completed'; profile.completedTasks++; fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2)); fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2))
    broadcast({ type: 'task-complete', taskId: req.body.taskId }, TOPIC_TASKS)
    res.json({ success: true })
  } else res.status(400).json({ success: false })
})
async function broadcast(data, topic) {
  try {
    await p2pNode.services.pubsub.publish(topic, uint8ArrayFromString(JSON.stringify(data)))
  } catch (e) {
    // Silent fail if no peers
  }
}
app.use('/images', express.static(path.join(__dirname, '../images')))
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`SkillMesh running at http://localhost:${PORT}`))
