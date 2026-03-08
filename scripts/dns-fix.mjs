/**
 * DNS override - routes all DNS lookups through Google DNS (8.8.8.8)
 * to bypass local DNS restrictions.
 * Import this FIRST before any network-dependent modules.
 */
import dns from 'dns'
import { Resolver } from 'dns'

const resolver = new Resolver()
resolver.setServers(['8.8.8.8', '8.8.4.4'])

const cache = new Map()

const originalLookup = dns.lookup.bind(dns)

dns.lookup = function (hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }

  // Use cached result if available
  if (cache.has(hostname)) {
    const addr = cache.get(hostname)
    if (options && options.all) {
      callback(null, [{ address: addr, family: 4 }])
    } else {
      callback(null, addr, 4)
    }
    return
  }

  resolver.resolve4(hostname, (err, addresses) => {
    if (err || !addresses?.length) {
      // Fall back to original
      return originalLookup(hostname, options, callback)
    }
    const addr = addresses[0]
    cache.set(hostname, addr)

    if (options && options.all) {
      callback(null, [{ address: addr, family: 4 }])
    } else {
      callback(null, addr, 4)
    }
  })
}
