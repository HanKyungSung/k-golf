// Replace Next.js Link with react-router-dom Link and integrate auth
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useState } from 'react'
import { PolicyModal } from '@/components/policy-modal'

const API_BASE = process.env.REACT_APP_API_BASE !== undefined ? process.env.REACT_APP_API_BASE : 'http://localhost:8080';

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  // Policy modal state
  const [policyModalOpen, setPolicyModalOpen] = useState(false)
  const [policyType, setPolicyType] = useState<'booking' | 'cancellation'>('booking')
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: '',
  })
  const [contactStatus, setContactStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [contactError, setContactError] = useState<string>('')

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setContactStatus('loading')
    setContactError('')

    try {
      // Validate form
      if (!contactForm.firstName || !contactForm.lastName || !contactForm.email || !contactForm.message) {
        setContactError('All fields are required')
        setContactStatus('error')
        return
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactForm.email)) {
        setContactError('Please enter a valid email address')
        setContactStatus('error')
        return
      }

      if (contactForm.message.length < 10) {
        setContactError('Message must be at least 10 characters')
        setContactStatus('error')
        return
      }

      // Send contact form
      const response = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }
      
      setContactStatus('success')
      setContactForm({ firstName: '', lastName: '', email: '', message: '' })
      
      // Reset success message after 5 seconds
      setTimeout(() => setContactStatus('idle'), 5000)
    } catch (error: any) {
      console.error('Contact form error:', error)
      setContactError(error.message || 'Failed to send message. Please try again.')
      setContactStatus('error')
    }
  }
  
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                K one Golf
              </h1>
              <span className="ml-2 text-sm text-slate-400">Premium Screen Golf</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-slate-300 hover:text-amber-400 transition-colors">
                Home
              </a>
              <a href="#about" className="text-slate-300 hover:text-amber-400 transition-colors">
                About
              </a>
              <a href="#pricing" className="text-slate-300 hover:text-amber-400 transition-colors">
                Pricing
              </a>
              <a href="#contact" className="text-slate-300 hover:text-amber-400 transition-colors">
                Contact
              </a>
            </nav>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link to="/dashboard">
                    <Button
                      variant="outline"
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                    >
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={async () => { await logout(); navigate('/'); }}
                    className="border-red-400/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button
                      variant="outline"
                      className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black"></div>
        <div className="absolute inset-0 bg-[url('/luxury-golf-simulator.png')] bg-cover bg-center opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-white sm:text-6xl md:text-7xl leading-tight">
              Luxury Screen Golf
              <span className="block bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                Redefined
              </span>
            </h2>
            <p className="mt-8 max-w-3xl mx-auto text-xl text-slate-300 leading-relaxed">
              Experience the pinnacle of indoor golf with our state-of-the-art simulators, premium private suites, and
              world-renowned courses. Where technology meets luxury.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6">
              <Link to="/booking">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold text-lg px-10 py-4 shadow-2xl shadow-amber-500/25"
                >
                  Reserve Your Suite
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-white mb-4">Premium Experience</h3>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">Every detail crafted for the discerning golfer</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">4K Ultra HD Display</h4>
                <p className="text-slate-400">
                  Crystal-clear 4K projection technology with ultra-wide screens for the most immersive golf experience.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 00-2 2v2m0 0V9a2 2 0 012-2h14a2 2 0 012 2v2M7 7V6a1 1 0 011-1h8a1 1 0 011 1v1"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">Professional Equipment</h4>
                <p className="text-slate-400">
                  Premium golf clubs, real golf balls, and professional-grade hitting mats for authentic gameplay.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm hover:bg-slate-800/70 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-white mb-3">Private Suites</h4>
                <p className="text-slate-400">
                  Luxurious private rooms with premium amenities, climate control, and concierge service.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-4xl font-bold text-white mb-6">
                Premium Korean-Style
                <span className="block text-amber-400">Screen Golf</span>
              </h3>
              <p className="text-slate-300 text-lg mb-6 leading-relaxed">
                K one Golf brings the authentic Korean screen golf experience to your city. Our state-of-the-art facility
                features 4 identical premium rooms, each equipped with cutting-edge simulation technology and
                professional-grade equipment for the ultimate indoor golf experience.
              </p>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Enjoy hassle-free hourly bookings for groups of 1-4 players. Each room offers the same premium 
                experience with 4K displays, climate control, and access to hundreds of world-class golf courses.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl font-bold text-amber-400 mb-2">4</div>
                  <div className="text-slate-400">Premium Rooms</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-400 mb-2">$35</div>
                  <div className="text-slate-400">Per Hour</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-2xl blur-3xl"></div>
              <img
                src="/room1.jpeg"
                alt="Luxury Golf Simulator"
                className="relative rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-white mb-4">Simple Pricing</h3>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              All 4 rooms are identical with the same premium experience - just pick your preferred time slot
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="bg-gradient-to-b from-amber-500/10 to-yellow-500/10 border-amber-500/50 backdrop-blur-sm relative">
              <div className="absolute top-4 right-4 bg-amber-500 text-slate-900 px-3 py-1 rounded-full text-sm font-semibold">
                All Rooms
              </div>
              <CardContent className="p-8 text-center">
                <div className="mb-8">
                  <h4 className="text-2xl font-semibold text-white mb-4">Premium Screen Golf Experience</h4>
                  <div className="text-4xl font-bold text-amber-400 mb-2">$35</div>
                  <div className="text-slate-400 text-lg">per hour</div>
                  <div className="text-sm text-slate-500 mt-2">Max 4 players per room</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center text-slate-300">
                      <svg className="w-5 h-5 text-amber-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      4K Ultra HD Display
                    </li>
                    <li className="flex items-center text-slate-300">
                      <svg className="w-5 h-5 text-amber-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      200+ Premium Golf Courses
                    </li>
                    <li className="flex items-center text-slate-300">
                      <svg className="w-5 h-5 text-amber-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Advanced Swing Analytics
                    </li>
                  </ul>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center text-slate-300">
                      <svg className="w-5 h-5 text-amber-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Climate Controlled Suite
                    </li>
                    <li className="flex items-center text-slate-300">
                      <svg className="w-5 h-5 text-amber-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Premium Refreshments
                    </li>
                    <li className="flex items-center text-slate-300">
                      <svg className="w-5 h-5 text-amber-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Professional Equipment
                    </li>
                  </ul>
                </div>

                <Link to="/booking">
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold text-lg py-4 shadow-lg">
                    Book Your Room Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 max-w-3xl mx-auto">
              <h4 className="text-lg font-semibold text-white mb-3">How Pricing Works</h4>
              <p className="text-slate-300 mb-4">
                Simple and transparent - pay by the hour, not by the person. All 4 rooms offer the same
                premium experience.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-amber-400 font-semibold">1 Hour</div>
                  <div className="text-slate-400">1 hour x $35 = $35</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-amber-400 font-semibold">3 Hours</div>
                  <div className="text-slate-400">3 hours x $35 = $105</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-amber-400 font-semibold">4 Hours</div>
                  <div className="text-slate-400">4 hours x $35 = $140</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h3 className="text-4xl font-bold text-white mb-6">Get In Touch</h3>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                Ready to experience the future of golf? Contact us to book your session or learn more about our premium
                facilities.
              </p>

              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Location</div>
                    <div className="text-slate-400">45 Keltic Dr, Unit 6, Sydney, NS B1S 1P4</div>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Phone</div>
                    <div className="text-slate-400">(902) 270-2259</div>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-white font-semibold">Hours</div>
                    <div className="text-slate-400">Mon-Sun: 10:00 AM - 12:00 AM</div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-8">
                <h4 className="text-2xl font-semibold text-white mb-6">Send us a message</h4>
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">First Name *</label>
                      <input
                        type="text"
                        value={contactForm.firstName}
                        onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Last Name *</label>
                      <input
                        type="text"
                        value={contactForm.lastName}
                        onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Email *</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Message *</label>
                    <textarea
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      placeholder="Tell us about your golf experience needs..."
                      required
                      minLength={10}
                    ></textarea>
                  </div>
                  
                  {contactStatus === 'error' && (
                    <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                      {contactError}
                    </div>
                  )}
                  
                  {contactStatus === 'success' && (
                    <div className="p-4 bg-green-900/20 border border-green-500/50 rounded-lg text-green-400 text-sm">
                      Thank you for your message! We'll get back to you soon.
                    </div>
                  )}
                  
                  <Button 
                    type="submit"
                    disabled={contactStatus === 'loading'}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {contactStatus === 'loading' ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* TODO: Fix column widths for better layout balance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent mb-4">
                K one Golf
              </h1>
              <p className="text-slate-400 mb-4">Premium screen golf experience where technology meets tradition.</p>
              <div className="flex space-x-4">
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-amber-500/20 transition-colors cursor-pointer">
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </div>
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-amber-500/20 transition-colors cursor-pointer">
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
                  </svg>
                </div>
                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-amber-500/20 transition-colors cursor-pointer">
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Services section - commented out until these features are implemented
            <div>
              <h5 className="text-white font-semibold mb-4">Services</h5>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#" className="hover:text-amber-400 transition-colors">
                    Screen Golf
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-amber-400 transition-colors">
                    Private Lessons
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-amber-400 transition-colors">
                    Corporate Events
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-amber-400 transition-colors">
                    Tournaments
                  </a>
                </li>
              </ul>
            </div>
            */}
            <div>
              <h5 className="text-white font-semibold mb-4">Support</h5>
              <ul className="space-y-2 text-slate-400">
                {/* Help Center - commented out until implemented
                <li>
                  <a href="#" className="hover:text-amber-400 transition-colors">
                    Help Center
                  </a>
                </li>
                */}
                <li>
                  <button
                    onClick={() => {
                      setPolicyType('booking')
                      setPolicyModalOpen(true)
                    }}
                    className="hover:text-amber-400 transition-colors text-left"
                  >
                    Booking Policy
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setPolicyType('cancellation')
                      setPolicyModalOpen(true)
                    }}
                    className="hover:text-amber-400 transition-colors text-left"
                  >
                    Cancellations
                  </button>
                </li>
                <li>
                  <a href="#contact" className="hover:text-amber-400 transition-colors">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
            {/* TODO: Newsletter section - revisit styling and layout
            <div>
              <h5 className="text-white font-semibold mb-4">Newsletter</h5>
              <p className="text-slate-400 mb-4">Stay updated with our latest offers and events.</p>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-l-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                <Button className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 rounded-l-none">
                  Subscribe
                </Button>
              </div>
            </div>
            */}
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p>&copy; 2026 K one Golf. All rights reserved. Premium screen golf experience.</p>
          </div>
        </div>
      </footer>
      
      {/* Policy Modal */}
      <PolicyModal
        open={policyModalOpen}
        onOpenChange={setPolicyModalOpen}
        type={policyType}
      />
    </div>
  )
}
