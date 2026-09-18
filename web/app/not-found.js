export default function NoEncontrado() {
  return (
    <div className="envoltura" style={{ padding: '60px 20px', textAlign: 'center' }}>
      <h1 className="fraunces" style={{ fontSize: 32 }}>No encontramos esa página</h1>
      <p className="mini" style={{ marginTop: 10 }}>Puede que la nota se haya movido o que el link esté roto.</p>
      <a href="/" className="boton rojo" style={{ marginTop: 20 }}>Volver a la portada</a>
    </div>
  );
}
