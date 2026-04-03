const services = ['API Integration', 'Cloud Deployment', 'Monitoring Setup'];

export default function ServicesPage() {
  return (
    <section>
      <h2>Services</h2>
      <ul>
        {services.map((service) => (
          <li key={service}>{service}</li>
        ))}
      </ul>
    </section>
  );
}
