import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, MapPin, Briefcase, PieChart , Link as LinkIcon} from "lucide-react";

export interface InvestorFilters {
  search: string;
  sector: string;
  investorType: string;
  location: string;
  mandateStatus: string;
  linkStatus: string;
}

interface InvestorFilterBarProps {
  filters: InvestorFilters;
  setFilters: (filters: InvestorFilters) => void;
  locations: string[]; // ✅ Defined in interface
}

export const SECTOR_OPTIONS = [
  "Auto Components", "Building Materials", "Chemicals & Materials", "Consumer",
  "Defence", "Financial Services", "Healthcare", "Healthcare & Pharma", "HR",
  "Industrials", "IPP", "IT", "Logistics", "Others", "Pharma", "Renewables",
  "Specialty Chemicals", "Travel and Hospitality"
];

export const TYPE_OPTIONS = [
  "PE", "Family Office", "Strategic", 
  "Angel Network", "Debt Fund","Bank","Overseas Investor","Other"
];


// ✅ FIX: Added 'locations' to the destructuring below
export default function InvestorFilterBar({ filters, setFilters, locations = [] }: InvestorFilterBarProps) {
  
  const handleReset = () => {
    setFilters({
      search: "",
      sector: "all",
      investorType: "all",
      location: "",
      mandateStatus: "all",
      linkStatus: "all",
    });
  };

return (
      <div className="grid grid-cols-1 md:grid-cols-14 gap-2 bg-gray-50 p-3 rounded-md border border-gray-200 mb-4 shadow-sm">
      
      {/* 1. Search (Name/Website) - changed to 3 Cols */}
      <div className="md:col-span-3 relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name or website..."
          className="pl-9 bg-white"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>

      {/* 2. Sector - changed to 2 Cols */}
      <div className="md:col-span-2">
        <Select 
          value={filters.sector} 
          onValueChange={(val) => setFilters({ ...filters, sector: val })}
        >
          <SelectTrigger className="bg-white">
            <div className="flex items-center gap-2 truncate">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Sectors" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-white max-h-[300px] z-50 shadow-xl border-gray-200">
            <SelectItem value="all">All Sectors</SelectItem>
            {SECTOR_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3. Investor Type - 2 Cols */}
      <div className="md:col-span-2">
        <Select 
          value={filters.investorType} 
          onValueChange={(val) => setFilters({ ...filters, investorType: val })}
        >
          <SelectTrigger className="bg-white">
             <div className="flex items-center gap-2 truncate">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Types" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-white z-50 shadow-xl border-gray-200">
            <SelectItem value="all">All Types</SelectItem>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 4. Location - 2 Cols */}
      <div className="md:col-span-2">
        <Select 
          value={filters.location || "all"} 
          onValueChange={(val) => setFilters({ ...filters, location: val === "all" ? "" : val })}
        >
          <SelectTrigger className="bg-white">
             <div className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Locations" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-white z-50 shadow-xl border-gray-200 max-h-[300px]">
            <SelectItem value="all">All Locations</SelectItem>
            {locations.length > 0 ? (
              locations.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))
            ) : (
               <div className="p-2 text-xs text-muted-foreground text-center">No locations found</div>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 5. Mandate Status - 2 Cols */}
      <div className="md:col-span-2">
        <Select
          value={filters.mandateStatus || "all"}
          onValueChange={(val) => setFilters({ ...filters, mandateStatus: val })}
        >
          <SelectTrigger className="bg-white">
            <div className="flex items-center gap-2 truncate">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Mandate Status" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-white z-50 shadow-xl border-gray-200">
            <SelectItem value="all">All Mandate Status</SelectItem>
            <SelectItem value="mandate">Mandate</SelectItem>
            <SelectItem value="not_mandate">Not Mandate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 6. Link Status - 2 Cols */}
      <div className="md:col-span-2">
        <Select 
          value={filters.linkStatus || "all"} 
          onValueChange={(val) => setFilters({ ...filters, linkStatus: val })}
        >
          <SelectTrigger className="bg-white">
             <div className="flex items-center gap-2 truncate">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All Links" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-white z-50 shadow-xl border-gray-200">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="linked">Linked</SelectItem>
            <SelectItem value="unlinked">Unlinked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 7. Reset - 1 Col */}
      <div className="md:col-span-1 flex justify-end">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleReset}
          title="Reset Filters"
          className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

}