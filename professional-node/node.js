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

const p2pNode = await createNode()
await p2pNode.start()
console.log('P2P Node started, id:', p2pNode.peerId.toString())

const TOPIC_TASKS = 'skillmesh-tasks'
p2pNode.services.pubsub.subscribe(TOPIC_TASKS)
p2pNode.services.pubsub.addEventListener('message', (evt) => {
  if (evt.detail.topic === TOPIC_TASKS) {
    try {
      const data = JSON.parse(uint8ArrayToString(evt.detail.data))
      handleP2PMessage(data)
    } catch (e) {
      console.error('P2P Message Parsing Error:', e.message)
    }
  }
})

function handleP2PMessage(message) {
  let changed = false
  if (message.type === 'task-broadcast') {
    if (!tasks.find(t => t.id === message.task.id)) { tasks.push(message.task); changed = true; }
  } else if (message.type === 'task-claim') {
    const task = tasks.find(t => t.id === message.taskId)
    if (task && !task.assignedTo) { task.assignedTo = message.assignedTo; task.status = 'assigned'; changed = true; }
  } else if (message.type === 'task-complete') {
    const task = tasks.find(t => t.id === message.taskId)
    if (task && task.status !== 'completed') { task.status = 'completed'; changed = true; }
  }
  if (changed) fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2))
}

app.get('/api/profile', (req, res) => res.json(profile))
app.get('/api/tasks', (req, res) => res.json(tasks))
app.post('/api/tasks', (req, res) => {
  tasks.push(req.body); fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2))
  broadcast({ type: 'task-broadcast', task: req.body })
  res.status(201).json(req.body)
})
app.post('/api/tasks/claim', (req, res) => {
  const task = tasks.find(t => t.id === req.body.taskId)
  if (task && !task.assignedTo) {
    task.assignedTo = profile.id; task.status = 'assigned'; fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2))
    broadcast({ type: 'task-claim', taskId: req.body.taskId, assignedTo: profile.id })
    res.json({ success: true })
  } else res.status(400).json({ success: false })
})
app.post('/api/tasks/complete', (req, res) => {
  const task = tasks.find(t => t.id === req.body.taskId)
  if (task && task.assignedTo === profile.id) {
    task.status = 'completed'; profile.completedTasks++; fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2)); fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2))
    broadcast({ type: 'task-complete', taskId: req.body.taskId })
    res.json({ success: true })
  } else res.status(400).json({ success: false })
})
async function broadcast(data) {
  try {
    await p2pNode.services.pubsub.publish(TOPIC_TASKS, uint8ArrayFromString(JSON.stringify(data)))
  } catch (e) {
    console.warn('Broadcast error (possibly no connected peers yet):', e.message)
  }
}
app.listen(3000, () => console.log('SkillMesh running at http://localhost:3000'))
