import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createNode } from './libp2p-network.js'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tasksPath = path.join(__dirname, 'tasks.json')
const profilePath = path.join(__dirname, 'profile.json')

let tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf8'))
let profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, '../frontend')))
app.use('/images', express.static(path.join(__dirname, '../images')))

const p2pNode = await createNode()
await p2pNode.start()
console.log('P2P Node started, id:', p2pNode.peerId.toString())

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
    location: `${profile.city}, ${profile.country}`
  }, TOPIC_HEARTBEAT)
}, 15000)

// Initial sync request after a short delay
setTimeout(() => {
  broadcast({ type: 'sync-request' }, TOPIC_TASKS)
}, 2000)

app.get('/api/profile', (req, res) => res.json(profile))
app.get('/api/tasks', (req, res) => res.json(tasks))
app.get('/api/mesh/stats', (req, res) => {
  res.json({
    peerCount: p2pNode.getPeers().length,
    activeProfessionals: Array.from(activePeers.values())
  })
})
app.post('/api/tasks', (req, res) => {
  tasks.push(req.body); fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2))
  broadcast({ type: 'task-broadcast', task: req.body }, TOPIC_TASKS)
  res.status(201).json(req.body)
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
app.listen(3000, () => console.log('SkillMesh running at http://localhost:3000'))
