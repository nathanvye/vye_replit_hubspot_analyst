import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, MapPin, Phone, Globe, Clock, Building2 } from "lucide-react";

interface BusinessProfileData {
  businessName: string;
  address: string;
  phone: string;
  website: string;
  categories: string[];
  hours: { day: string; hours: string }[];
  averageRating: number;
  totalReviewCount: number;
  mapsUri: string;
}

interface BusinessProfileCardProps {
  data: BusinessProfileData;
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array(fullStars).fill(0).map((_, i) => (
        <Star key={`full-${i}`} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <Star className="w-5 h-5 text-gray-300" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      )}
      {Array(emptyStars).fill(0).map((_, i) => (
        <Star key={`empty-${i}`} className="w-5 h-5 text-gray-300" />
      ))}
    </div>
  );
}

export function BusinessProfileCard({ data }: BusinessProfileCardProps) {
  if (!data) return null;

  return (
    <Card data-testid="business-profile-card" className="border-l-4 border-l-[#5C3D5E]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-[#5C3D5E] flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Google Business Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-xl font-bold text-foreground" data-testid="business-name">
                {data.businessName}
              </h3>
              {data.categories.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {data.categories.join(' • ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3" data-testid="business-rating">
              <StarRating rating={data.averageRating} />
              <span className="font-bold text-lg">{data.averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({data.totalReviewCount.toLocaleString()} reviews)
              </span>
            </div>

            <div className="grid gap-2 text-sm">
              {data.address && (
                <div className="flex items-start gap-2" data-testid="business-address">
                  <MapPin className="w-4 h-4 mt-0.5 text-[#5C3D5E] flex-shrink-0" />
                  <span>{data.address}</span>
                </div>
              )}
              {data.phone && (
                <div className="flex items-center gap-2" data-testid="business-phone">
                  <Phone className="w-4 h-4 text-[#5C3D5E]" />
                  <a href={`tel:${data.phone}`} className="hover:underline">{data.phone}</a>
                </div>
              )}
              {data.website && (
                <div className="flex items-center gap-2" data-testid="business-website">
                  <Globe className="w-4 h-4 text-[#5C3D5E]" />
                  <a 
                    href={data.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline text-blue-600 truncate max-w-xs"
                  >
                    {data.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </div>
              )}
            </div>
          </div>

          {data.hours.length > 0 && (
            <div className="border-l pl-6 hidden lg:block">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[#5C3D5E]" />
                <span className="font-medium text-sm">Business Hours</span>
              </div>
              <div className="text-sm space-y-1">
                {data.hours.map((h) => (
                  <div key={h.day} className="flex justify-between gap-4">
                    <span className="text-muted-foreground w-24">{h.day}</span>
                    <span className="font-mono text-xs">{h.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {data.mapsUri && (
          <div className="pt-2 border-t">
            <a 
              href={data.mapsUri} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              View on Google Maps
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
