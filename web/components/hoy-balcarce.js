'use client';

// "Hoy en Balcarce": clima, farmacia de turno y dólar en un panel con tres
// pestañas (28/09 a la noche, "así no se leen los datos" con los tres
// renglones apretados; el diseño es la idea C del lienzo "Radar Balcarce –
// Servicios"). Se ve una cosa por vez, con los números grandes, y cada
// pestaña termina en el enlace a su página (/clima, /farmacias, /dolar).
//
// Lo que se mantiene de las versiones anteriores (Hernán, 28/09): nada de
// botones de farmacia en la portada ("dos cruces de farmacias es mucho para
// la pantalla principal"). La pestaña muestra nombre y dirección; llamar y
// cómo llegar están en /farmacias.
//
// Clima y dólar se actualizan solos en el navegador (el mismo pedido que la
// pastilla de arriba y /dolar: los números de la misma pantalla coinciden).
// La farmacia llega del servidor como dato, no como componente: piezas.js
// trae node:fs y no se puede importar desde un componente de cliente.

import { useEffect, useState } from 'react';
import { useClimaVivo } from '@/lib/pedir-clima';
import { IconoCielo, SolChico } from './clima-vivo';
import useDolar from '@/components/usar-dolar';
import { filasDelPanel, pesosEnteros } from '@/lib/dolar';
import { comoNombre } from '@/lib/texto';

const DIA_CORTO = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

/** "2026-09-28" de hoy en Balcarce, sin importar la hora del navegador. */
function hoyEnBalcarce() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
}

/** Las farmacias de turno, como se escriben: el detalle (del directorio del
 *  Colegio) trae acentos y dirección; si no está, sólo los nombres. */
export function farmaciasDeTurno(farmacia) {
  if (!farmacia) return [];
  if (farmacia.detalle?.length) {
    return farmacia.detalle
      .map((f) => ({ nombre: comoNombre(f.nombre), direccion: f.direccion ?? null }))
      .filter((f) => f.nombre);
  }
  return (farmacia.farmacias ?? []).map((n) => ({ nombre: comoNombre(n), direccion: null })).filter((f) => f.nombre);
}

/** Sólo los nombres (lo usan otras partes del sitio). */
export function nombresDeTurno(farmacia) {
  return farmaciasDeTurno(farmacia).map((f) => f.nombre);
}

/** Los tres días que siguen a hoy. Hasta saber qué día es en el navegador,
 *  los que armó el servidor sin el primero (que es el día del build). */
function diasQueSiguen(dias = [], hoy) {
  return (hoy ? dias.filter((d) => d.fecha > hoy) : dias.slice(1)).slice(0, 3);
}

function PanelClima({ a, dias }) {
  const detalle = [
    a.sensacion != null ? `Sensación ${a.sensacion}°` : null,
    a.viento != null ? `Viento ${[a.rumbo, a.viento].filter((x) => x != null && x !== '').join(' ')} km/h` : null,
    a.humedad != null ? `Humedad ${a.humedad}%` : null,
  ].filter(Boolean).join(' · ');
  return (
    <>
      <div className="ahora-hoy">
        <div className="temp-hoy">
          <strong>{a.temp}°</strong>
          <span>{a.cielo}</span>
        </div>
        <IconoCielo cielo={a.cielo} esDeDia={a.esDeDia !== false} tamano={52} />
      </div>
      {detalle && <p className="detalle-hoy">{detalle}</p>}
      {dias.length > 0 && (
        <ul className="dias-hoy">
          {dias.map((d) => (
            <li key={d.fecha}>
              <span className="nombre-dia-hoy">{DIA_CORTO[new Date(`${d.fecha}T12:00:00`).getDay()]}</span>
              <SolChico cielo={d.cielo} tamano={30} />
              <span className="temps-hoy"><strong>{d.max}°</strong> {d.min}°</span>
              <span className={d.lluvia >= 20 ? 'lluvia-hoy' : 'lluvia-hoy sin-lluvia'}>
                {d.lluvia >= 20 ? `${d.lluvia}%` : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <a href="/clima" className="enlace-hoy">Pronóstico extendido ›</a>
    </>
  );
}

function PanelFarmacias({ turno }) {
  return (
    <>
      <p className="detalle-hoy">De turno hoy</p>
      <ul className="farmacias-hoy">
        {turno.map((f) => (
          <li key={f.nombre}>
            <strong>{f.nombre}</strong>
            {f.direccion && <span>{f.direccion}</span>}
          </li>
        ))}
      </ul>
      <a href="/farmacias" className="enlace-hoy enlace-farmacia-hoy">Teléfonos y turnos de la semana ›</a>
    </>
  );
}

function PanelDolar({ filas }) {
  return (
    <>
      <table className="dolar-hoy">
        <thead>
          <tr><th scope="col"><span className="solo-lectores">Dólar</span></th><th scope="col">Compra</th><th scope="col">Venta</th></tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.casa}>
              <th scope="row">{f.nombre}</th>
              <td>{f.compra != null ? pesosEnteros(f.compra) : '—'}</td>
              <td><strong>{pesosEnteros(f.venta)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <a href="/dolar" className="enlace-hoy">Todos los dólares ›</a>
    </>
  );
}

export function HoyEnBalcarce({ clima, farmacia, foto }) {
  const [datosClima] = useClimaVivo(clima);
  const { datos: datosDolar } = useDolar(foto);
  const [hoy, setHoy] = useState(null);
  useEffect(() => { setHoy(hoyEnBalcarce()); }, []);

  const a = datosClima?.ahora;
  const turno = farmaciasDeTurno(farmacia);
  const filas = filasDelPanel(datosDolar?.cotizaciones ?? [])
    .filter((f) => f.casa === 'oficial' || f.casa === 'blue');

  const pestanas = [
    a && { id: 'clima', etiqueta: `Clima ${a.temp}°` },
    turno.length > 0 && { id: 'farmacias', etiqueta: 'Farmacias' },
    filas.length > 0 && { id: 'dolar', etiqueta: 'Dólar' },
  ].filter(Boolean);
  const [elegida, setElegida] = useState(null);

  if (!pestanas.length) return null;
  const activa = pestanas.find((p) => p.id === elegida)?.id ?? pestanas[0].id;

  return (
    <section className="hoy-balcarce" aria-label="Hoy en Balcarce">
      <div className="pestanas-hoy" role="tablist" aria-label="Hoy en Balcarce">
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`pestana-hoy-${p.id}`}
            aria-selected={activa === p.id}
            aria-controls={`panel-hoy-${p.id}`}
            className={activa === p.id ? 'pestana-hoy activa' : 'pestana-hoy'}
            onClick={() => setElegida(p.id)}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>
      <div className="panel-hoy" role="tabpanel" id={`panel-hoy-${activa}`} aria-labelledby={`pestana-hoy-${activa}`}>
        {activa === 'clima' && <PanelClima a={a} dias={diasQueSiguen(datosClima?.dias, hoy)} />}
        {activa === 'farmacias' && <PanelFarmacias turno={turno} />}
        {activa === 'dolar' && <PanelDolar filas={filas} />}
      </div>
    </section>
  );
}
