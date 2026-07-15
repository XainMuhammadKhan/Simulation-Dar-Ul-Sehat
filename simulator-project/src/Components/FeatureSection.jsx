import React from "react";
import featureIcon1 from "../assets/feature1.png";
import featureIcon2 from "../assets/feature2.png";
import featureIcon3 from "../assets/feature3.png";
import Footer from "./Footer";
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const FeatureSection = () => {
  const [featuresRef, featuresVisible] = useScrollAnimation(0.2);
  const [workflowRef, workflowVisible] = useScrollAnimation(0.2);

  const features = [
    {
      title: "Real-Time ED Simulation",
      description: "Live visualization of patient flow, waiting times, and resource utilization in emergency departments.",
      icon: featureIcon1,
      color: "from-[#2C80D3] to-[#0C3E72]"
    },
    {
      title: "Multi-Server Queuing",
      description: "Advanced FCFS scheduling with multi-server support for efficient patient flow management.",
      icon: featureIcon2,
      color: "from-[#0C3E72] to-[#091d3a]"
    },
    {
      title: "Healthcare Analytics",
      description: "Comprehensive performance metrics including patient wait times and staff utilization rates.",
      icon: featureIcon3,
      color: "from-[#091d3a] to-[#2C80D3]"
    }
  ];

  const workflowSteps = [
    {
      step: "1",
      title: "Configure Hospital Parameters",
      description: "Set arrival rates, service times, and staff allocation for different patient categories.",
      icon: "⚙️"
    },
    {
      step: "2",
      title: "Run Trauma Center Simulation",
      description: "Execute real-time simulations with visual queue displays and patient flow tracking.",
      icon: "🚑"
    },
    {
      step: "3",
      title: "Analyze ED Performance",
      description: "Review detailed analytics on wait times, resource utilization, and bottleneck identification.",
      icon: "📈"
    },
    {
      step: "4",
      title: "Optimize Resource Allocation",
      description: "Implement data-driven improvements to enhance patient care and operational efficiency.",
      icon: "🎯"
    }
  ];

  return (
    <>
      {/* Features Section */}
      <section ref={featuresRef} id="features" className="py-20 bg-gradient-to-b from-white to-[#e8f4fd]">
        <div className="container mx-auto px-4">
          <div className={`text-center mb-16 transition-all duration-1000 ${
            featuresVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <h2 className="text-4xl md:text-5xl font-black text-[#0C3E72] mb-4">
              Advanced Healthcare Analytics
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform your emergency department with data-driven queue management solutions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative bg-white rounded-3xl p-8 shadow-2xl hover:shadow-3xl transform transition-all duration-700 border border-gray-100 ${
                  featuresVisible 
                    ? 'translate-y-0 opacity-100 scale-100' 
                    : index % 2 === 0 
                      ? '-translate-x-20 opacity-0 scale-95' 
                      : 'translate-x-20 opacity-0 scale-95'
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} rounded-3xl opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                
                <div className="relative z-10">
                  <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <img
                      src={feature.icon}
                      alt={`${feature.title} Icon`}
                      className="w-12 h-12 filter brightness-0 invert"
                    />
                  </div>
                  <h3 className="text-2xl font-bold text-center text-[#091d3a] mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-center leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={workflowRef} id="how-it-works" className="py-20 bg-gradient-to-br from-[#091d3a] to-[#0C3E72] text-white">
        <div className="container mx-auto px-4">
          <div className={`text-center mb-16 transition-all duration-1000 ${
            workflowVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-sky-300">
              Emergency Department Workflow
            </h2>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto">
              Streamline your Emergency center operations with our proven 4-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {workflowSteps.map((step, index) => (
              <div
                key={index}
                className={`group relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 hover:bg-white/20 transform transition-all duration-700 ${
                  workflowVisible 
                    ? 'translate-y-0 opacity-100 scale-100' 
                    : 'translate-y-20 opacity-0 scale-95'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <div className="w-12 h-12 bg-sky-400 text-[#091d3a] rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-bold text-sky-300 mb-4">
                    {step.title}
                  </h3>
                  <p className="text-gray-200 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className={`text-center mt-16 transition-all duration-1000 delay-500 ${
            workflowVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-sky-300/30 max-w-4xl mx-auto">
              <h3 className="text-3xl font-black text-sky-300 mb-4">
                Ready to Optimize Your Emergency Department?
              </h3>
              <p className="text-xl text-gray-200 mb-6">
                Start simulating and transform your patient care experience today
              </p>
              <a
                href="/simulation"
                className="inline-block bg-sky-400 text-[#091d3a] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-sky-300 transform hover:scale-105 transition-all duration-300 shadow-2xl"
              >
                Launch Simulator
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default FeatureSection;