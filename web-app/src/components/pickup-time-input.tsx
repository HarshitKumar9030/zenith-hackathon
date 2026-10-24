"use client";
import { validPickupTime } from "@/lib/pickup-time";
export default function PickupTimeInput({value,onChange}:{value:string;onChange:(value:string)=>void;weightKg?:number;segregated?:boolean}) {
 const valid=validPickupTime(value);
 return <label className="field">Pickup time (IST)<input type="time" name="pickupTime" aria-label="Pickup time" value={value} step="60" required aria-invalid={!valid} onChange={e=>{e.target.setCustomValidity(validPickupTime(e.target.value)?"":"Choose a valid time.");onChange(e.target.value)}}/><small>{valid?"Hackathon hours: available 24 hours, with no break or surge charge.":"Choose a valid time."}</small></label>;
}
