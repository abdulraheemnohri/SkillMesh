import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { noise } from '@libp2p/noise'
import { mplex } from '@libp2p/mplex'
import { gossipsub } from '@libp2p/gossipsub'
import { mdns } from '@libp2p/mdns'
import { bootstrap } from '@libp2p/bootstrap'
import { identify } from '@libp2p/identify'

export async function createNode(bootstrapNodes = []) {
  const options = {
    addresses: { listen: ['/ip4/0.0.0.0/tcp/0'] },
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    services: { pubsub: gossipsub(), identify: identify() },
    peerDiscovery: [mdns()]
  }
  if (bootstrapNodes.length > 0) {
    options.peerDiscovery.push(bootstrap({ list: bootstrapNodes }))
  }
  return await createLibp2p(options)
}
